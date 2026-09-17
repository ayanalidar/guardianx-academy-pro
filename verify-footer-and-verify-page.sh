#!/usr/bin/env bash
# Verify the FOOTER-VERIFY-FIX changes end-to-end:
#  - 7-column LEGAL-inclusive footer (TRAINING, PRACTICE, ASSESSMENT,
#    INSTITUTIONS, COMPANY, RESOURCES, LEGAL)
#  - /#/verify/<id> page loads correctly
# Runs in a single bash command per the spec.

set -e
cd /home/z/my-project

# 0) Clean stale Turbopack temp files
find tool-results -name ".*" -type f -delete 2>/dev/null
echo "✓ tool-results cleaned"

# 0b) Load env vars from .env (must be created by the developer — see .env.example)
if [[ ! -f .env ]]; then
  echo "ERROR: .env not found. Copy .env.example -> .env and fill in values." >&2
  exit 1
fi
set -a
. ./.env
set +a
: "${DATABASE_URL:?DATABASE_URL must be set in .env}"
: "${NEXTAUTH_SECRET:?NEXTAUTH_SECRET must be set in .env}"
echo "✓ DATABASE_URL loaded from .env"

# 1) Start dev server (background)
( ./node_modules/.bin/next dev -p 3000 > /home/z/my-project/dev.log 2>&1 ) &
DEV_PID=$!
echo "✓ dev server started (PID $DEV_PID)"

# 2) Wait for dev server to come up
for i in $(seq 1 60); do
  if curl -sf http://localhost:3000/ > /dev/null 2>&1; then
    echo "✓ dev server reachable after ${i}s"
    break
  fi
  sleep 1
done

# 3) Warm-up: compile the homepage once so the first agent-browser visit is fast
echo "--- Warm-up: curl homepage ---"
curl -sf http://localhost:3000/ -o /dev/null && echo "  ✓ / warmed"
sleep 1

# 4) Warm the verify API route (with a fake id) so its first compile is done
echo "--- Warm-up: curl verify API ---"
curl -s "http://localhost:3000/api/credentials/verify/test-id" | head -c 300
echo ""
sleep 1

# 5) agent-browser session — navigate to homepage, snapshot the footer,
#    then navigate to #/verify/test-id and snapshot the verify page.
SESSION="footer-verify-$$"
echo "--- agent-browser session: $SESSION ---"

# Open the homepage (no `new` command — use `open` directly with --session)
agent-browser --session "$SESSION" open "http://localhost:3000/#/" > /dev/null 2>&1
sleep 3
echo "✓ homepage opened"

# Scroll to the footer so its content is in the rendered DOM
agent-browser --session "$SESSION" scroll down 9999 > /dev/null 2>&1
sleep 2

# Read the page text (footer is in the DOM after scroll)
agent-browser --session "$SESSION" read > /tmp/read-home.txt 2>&1
echo "✓ homepage read captured (bytes: $(wc -c < /tmp/read-home.txt))"

# Search for each of the 7 column headers in the read text
echo ""
echo "===== FOOTER COLUMN VERIFICATION ====="
for col in TRAINING PRACTICE ASSESSMENT INSTITUTIONS COMPANY RESOURCES LEGAL; do
  if grep -q "$col" /tmp/read-home.txt; then
    echo "✓ Found column: $col"
  else
    echo "✗ MISSING column: $col"
  fi
done

# Verify some link labels too
echo ""
echo "===== FOOTER LINK SPOT-CHECK ====="
for label in "Courses" "Cyber Range" "Proctored Exams" "Partner With Us" "Careers" "Webinars" "Responsible Disclosure" "Cookie Policy"; do
  if grep -q "$label" /tmp/read-home.txt; then
    echo "✓ Found link: $label"
  else
    echo "✗ MISSING link: $label"
  fi
done

# Take a screenshot of the footer (still scrolled down)
agent-browser --session "$SESSION" screenshot "/home/z/my-project/agent-ctx/footer-7col.png" > /dev/null 2>&1
echo "✓ footer screenshot saved"

# 6) Navigate to /#/verify/test-id (test-id is unlikely to exist → Not Found card expected)
echo ""
echo "===== VERIFY PAGE TEST ====="
agent-browser --session "$SESSION" open "http://localhost:3000/#/verify/test-id" > /dev/null 2>&1
sleep 4
agent-browser --session "$SESSION" read > /tmp/read-verify.txt 2>&1
echo "✓ verify page read captured (bytes: $(wc -c < /tmp/read-verify.txt))"

# The verify page should show the GUARDIANX CREDENTIAL VERIFIER badge and either
# "Not Found" (test-id is fake) or "Verified" (very unlikely)
echo ""
echo "===== VERIFY PAGE CONTENT VERIFICATION ====="
for needle in "GUARDIANX CREDENTIAL VERIFIER" "Verify a" "Not Found" "test-id"; do
  if grep -q "$needle" /tmp/read-verify.txt; then
    echo "✓ Found: $needle"
  else
    echo "✗ MISSING: $needle"
  fi
done

# Screenshot the verify page
agent-browser --session "$SESSION" screenshot "/home/z/my-project/agent-ctx/verify-page.png" > /dev/null 2>&1
echo "✓ verify page screenshot saved"

# 7) Also test that /#/verify (no id) loads the empty state
echo ""
echo "===== VERIFY PAGE (no id) — EMPTY STATE ====="
agent-browser --session "$SESSION" open "http://localhost:3000/#/verify" > /dev/null 2>&1
sleep 3
agent-browser --session "$SESSION" read > /tmp/read-verify-empty.txt 2>&1
if grep -q "Awaiting credential ID" /tmp/read-verify-empty.txt; then
  echo "✓ Empty state shows 'Awaiting credential ID'"
else
  echo "✗ Empty state NOT showing 'Awaiting credential ID'"
fi

# 8) Close the browser
agent-browser --session "$SESSION" close > /dev/null 2>&1 || true
echo ""
echo "✓ browser session closed"

# 9) Tail dev.log for any errors
echo ""
echo "===== TAIL DEV.LOG (last 30 lines) ====="
tail -30 /home/z/my-project/dev.log

# 10) Kill dev server
kill $DEV_PID 2>/dev/null
wait $DEV_PID 2>/dev/null
echo ""
echo "✓ dev server killed"
