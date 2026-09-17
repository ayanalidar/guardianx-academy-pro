#!/usr/bin/env bash
set -euo pipefail

# Load env from .env (copy .env.example -> .env first)
if [[ ! -f .env ]]; then
  echo "ERROR: .env not found. Copy .env.example -> .env and fill in values." >&2
  exit 1
fi
set -a
. ./.env
set +a
: "${DATABASE_URL:?DATABASE_URL must be set in .env}"
: "${NEXTAUTH_SECRET:?NEXTAUTH_SECRET must be set in .env}"

rm -f tool-results/*.txt 2>/dev/null || true

( ./node_modules/.bin/next dev -p 3000 > dev.log 2>&1 ) &
DEV_PID=$!

echo "[verify] Waiting for dev server (pid $DEV_PID)..."
for i in $(seq 1 60); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "000")
  if [ "$CODE" = "200" ]; then
    echo "[verify] Dev server ready after ${i}s"
    break
  fi
  sleep 1
done

curl -s -o /dev/null http://localhost:3000/api/auth/session
curl -s -o /dev/null http://localhost:3000/api/office-hours/available
curl -s -o /dev/null http://localhost:3000/api/courses?enrolled=true

# Seed: create an office hour slot + set lastAccessed on a student enrollment
echo "[verify] Seeding test slot + lastAccessed..."
SEED_OUT=$(bun run /home/z/my-project/seed-and-verify.mjs 2>&1 || true)
echo "$SEED_OUT"
SLOT_ID=$(echo "$SEED_OUT" | grep "^SLOT:" | sed -E 's/.*"id":"([^"]+)".*/\1/')
echo "[verify] Seeded slot id: $SLOT_ID"

# === Curl-based API verification ===
# Login as student via NextAuth credentials
STUDENT_JAR=$(mktemp /tmp/gx-student.XXXXXX.txt)
CSRF=$(curl -s -c "$STUDENT_JAR" http://localhost:3000/api/auth/csrf | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')
curl -s -b "$STUDENT_JAR" -c "$STUDENT_JAR" -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "csrfToken=${CSRF}&email=student%40academy.guardianx.cloud&password=student123&callbackUrl=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fcallback%2Fcredentials&json=true" \
  http://localhost:3000/api/auth/callback/credentials > /dev/null
echo "[verify] Student login via curl done"

# Test: GET available slots — should include the seeded slot
AVAIL=$(curl -s -b "$STUDENT_JAR" http://localhost:3000/api/office-hours/available)
echo "[verify] /api/office-hours/available (truncated): ${AVAIL:0:200}"
AVAIL_HAS_SLOT=$(echo "$AVAIL" | grep -c "$SLOT_ID" || echo 0)
echo "[verify] Available has seeded slot? $AVAIL_HAS_SLOT"

# Test: POST book the slot — should return 201
if [ -n "$SLOT_ID" ]; then
  BOOK_RES=$(curl -s -b "$STUDENT_JAR" -w "\nHTTP:%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    --data '{"topic":"Subnetting help","notes":"Need walkthrough of VLSM"}' \
    http://localhost:3000/api/office-hours/$SLOT_ID/book)
  echo "[verify] Book response: ${BOOK_RES:0:200}"

  # Test: POST book again — should return 400 (double-booking)
  BOOK_RES2=$(curl -s -b "$STUDENT_JAR" -w "\nHTTP:%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    --data '{"topic":"second attempt","notes":""}' \
    http://localhost:3000/api/office-hours/$SLOT_ID/book)
  echo "[verify] Double-book response: ${BOOK_RES2:0:200}"

  # Test: GET my-bookings — should include the new booking
  MY_BOOKINGS=$(curl -s -b "$STUDENT_JAR" http://localhost:3000/api/office-hours/my-bookings)
  echo "[verify] /api/office-hours/my-bookings (truncated): ${MY_BOOKINGS:0:300}"
fi

# === Browser-based verification ===
echo "[verify] Opening app at #/login (forces AuthScreen to render)..."
agent-browser close --all 2>/dev/null || true
agent-browser open "http://localhost:3000/#/login" 2>&1 | tail -2
agent-browser wait --text "Sign in to continue" 2>&1 | tail -2 || true
agent-browser wait 2000 2>&1 | tail -2 || true

echo "[verify] Filling email + password + clicking Sign In..."
agent-browser eval "(function(){
  function setNativeValue(el, value) {
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, value); else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  setNativeValue(document.getElementById('email'), 'student@academy.guardianx.cloud');
  setNativeValue(document.getElementById('password'), 'student123');
  const btn = document.querySelector('form button[type=\"submit\"]');
  if (btn) btn.click();
  return 'submitted';
})()" 2>&1 | tail -3

agent-browser wait --text "Dashboard" 2>&1 | tail -2 || true
agent-browser wait 4000 2>&1 | tail -2 || true

echo "[verify] ====== Sidebar check ======"
agent-browser eval "JSON.stringify({
  url: window.location.hash,
  sidebarHasBookSession: !!Array.from(document.querySelectorAll('button, a')).find(e => (e.textContent||'').trim() === 'Book a Session'),
  sidebarHasMyLearning: !!Array.from(document.querySelectorAll('button, a')).find(e => (e.textContent||'').trim() === 'My Learning'),
})" 2>&1 | tail -3

# Navigate to #/learning
echo "[verify] Navigating to #/learning..."
agent-browser open "http://localhost:3000/#/learning" 2>&1 | tail -2
agent-browser wait --text "My learning" 2>&1 | tail -2 || true
agent-browser wait 4000 2>&1 | tail -2 || true

echo "[verify] ====== #/learning H1 + stats ======"
agent-browser eval "JSON.stringify({
  url: window.location.hash,
  h1: document.querySelector('h1')?.textContent?.trim() || null,
  h2s: Array.from(document.querySelectorAll('h2')).map(h => h.textContent?.trim()).slice(0,10),
  totalXpInDom: document.body.textContent.includes('Total XP'),
  totalEnrollmentsInDom: document.body.textContent.includes('Total enrollments'),
  inProgressInDom: document.body.textContent.includes('In progress'),
  completedLabelInDom: document.body.textContent.includes('Completed'),
  lastAccessedInDom: document.body.textContent.includes('LAST'),
  recommendedInDom: document.body.textContent.includes('RECOMMENDED FOR YOU'),
  continueLearningInDom: document.body.textContent.includes('Continue your journey'),
})" 2>&1 | tail -10

# Navigate to #/book-session
echo "[verify] Navigating to #/book-session..."
agent-browser open "http://localhost:3000/#/book-session" 2>&1 | tail -2
agent-browser wait --text "Book a Live Session" 2>&1 | tail -2 || true
agent-browser wait 5000 2>&1 | tail -2 || true

echo "[verify] ====== #/book-session H1 + sections ======"
agent-browser eval "JSON.stringify({
  url: window.location.hash,
  h1: document.querySelector('h1')?.textContent?.trim() || null,
  h2s: Array.from(document.querySelectorAll('h2')).map(h => h.textContent?.trim()),
  bookASession: document.body.textContent.includes('Book a Live Session'),
  pickATime: document.body.textContent.includes('Pick a time'),
  myBookings: document.body.textContent.includes('My Bookings'),
  perksInDom: document.body.textContent.includes('Veteran instructors'),
  upcomingSlotsInDom: document.body.textContent.includes('UPCOMING SLOTS'),
  slotCountText: (document.body.textContent.match(/(\d+)\s+SLOTS?\s+OPEN/i) || [])[0] || null,
  bookButtons: Array.from(document.querySelectorAll('button')).filter(b => /Book Slot/i.test(b.textContent||'')).length,
})" 2>&1 | tail -10

# Try clicking a Book Slot button to open the dialog
echo "[verify] ====== Click first Book Slot button ======"
agent-browser eval "(function(){
  const btn = Array.from(document.querySelectorAll('button')).find(b => /Book Slot/i.test(b.textContent||''));
  if (btn) { btn.click(); return 'clicked'; }
  return 'no-book-button';
})()" 2>&1 | tail -3
agent-browser wait 2000 2>&1 | tail -2 || true

echo "[verify] ====== Dialog open check ======"
agent-browser eval "JSON.stringify({
  dialogOpen: !!document.querySelector('[role=dialog]'),
  dialogTitle: document.querySelector('[role=dialog] h2, [role=dialog] [class*=DialogTitle]')?.textContent?.trim() || null,
  hasTopicInput: !!document.querySelector('#book-topic'),
  hasNotesInput: !!document.querySelector('#book-notes'),
  hasConfirmButton: !!Array.from(document.querySelectorAll('button')).find(b => /Confirm Booking/i.test(b.textContent||'')),
})" 2>&1 | tail -5

# Take a screenshot for posterity
agent-browser screenshot /tmp/book-session-dialog.png 2>&1 | tail -2 || true

# Close the dialog (press Escape)
agent-browser press Escape 2>&1 | tail -2 || true

# === Cleanup ===
# Delete the seeded slot (this also deletes the booking due to onDelete: Cascade)
if [ -n "$SLOT_ID" ]; then
  echo "[verify] Cleaning up seeded slot $SLOT_ID..."
  bun -e "
    import { PrismaClient } from '@prisma/client'
    const prisma = new PrismaClient()
    await prisma.officeHourSlot.delete({ where: { id: '$SLOT_ID' } })
    console.log('SLOT_DELETED')
    await prisma.\$disconnect()
  " 2>&1 | tail -3
fi

# Reset the student's enrollment lastAccessed to NULL (cleanup)
echo "[verify] Resetting student lastAccessed..."
bun -e "
  import { PrismaClient } from '@prisma/client'
  const prisma = new PrismaClient()
  const student = await prisma.user.findFirst({ where: { email: 'student@academy.guardianx.cloud' }, select: { id: true } })
  if (student) {
    await prisma.enrollment.updateMany({ where: { userId: student.id }, data: { lastAccessed: null } })
  }
  console.log('LAST_ACCESSED_RESET')
  await prisma.\$disconnect()
" 2>&1 | tail -3

echo "[verify] Killing dev server (pid $DEV_PID)..."
kill $DEV_PID 2>/dev/null || true
wait $DEV_PID 2>/dev/null || true
rm -f "$STUDENT_JAR" 2>/dev/null || true
echo "[verify] DONE"
