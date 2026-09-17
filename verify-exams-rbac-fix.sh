#!/bin/bash
# Verification script for EXAMS-RBAC-FIX task.
# Tests: RBAC requireRole enforcement + exam engine shuffle/submit/scoring.

set -u  # Don't use -e: we want to keep running through failures to print all results.

cd /home/z/my-project

# Clean state
rm -f /tmp/admin-cookies.txt /tmp/student-cookies.txt /tmp/curl-out*.html /tmp/start*.json /tmp/submit*.json

# Make sure no stale dev server
pkill -f "next dev" 2>/dev/null || true
sleep 1

# Start dev server in background (reads from .env — copy .env.example first)
set -a
. /home/z/my-project/.env
set +a
: "${DATABASE_URL:?DATABASE_URL must be set in .env}"
: "${NEXTAUTH_SECRET:?NEXTAUTH_SECRET must be set in .env}"
NEXTAUTH_URL="http://localhost:3000" \
  ./node_modules/.bin/next dev -p 3000 > /home/z/my-project/dev.log 2>&1 &
DEV_PID=$!
echo "Dev server PID: $DEV_PID"

# Wait for ready
for i in {1..30}; do
  if curl -s -o /dev/null --max-time 3 http://localhost:3000/ ; then
    echo "Dev server ready after ${i}s"
    break
  fi
  sleep 1
done

echo ""
echo "============================================================"
echo "FEATURE 2 — RBAC: requireRole() enforcement"
echo "============================================================"

echo ""
echo "=== Logging in as ADMIN (admin@academy.guardianx.cloud / admin123) ==="
CSRF_ADMIN=$(curl -s -c /tmp/admin-cookies.txt http://localhost:3000/api/auth/csrf | python3 -c "import json,sys;print(json.load(sys.stdin)['csrfToken'])" 2>/dev/null)
echo "CSRF token: $CSRF_ADMIN"
curl -s -b /tmp/admin-cookies.txt -c /tmp/admin-cookies.txt -L -X POST \
  http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=admin@academy.guardianx.cloud&password=admin123&csrfToken=${CSRF_ADMIN}&callbackUrl=http://localhost:3000/&json=true" \
  -o /dev/null -w "Login HTTP %{http_code}\n"

echo ""
echo "=== Logging in as STUDENT (student@academy.guardianx.cloud / student123) ==="
CSRF_STUDENT=$(curl -s -c /tmp/student-cookies.txt http://localhost:3000/api/auth/csrf | python3 -c "import json,sys;print(json.load(sys.stdin)['csrfToken'])" 2>/dev/null)
echo "CSRF token: $CSRF_STUDENT"
curl -s -b /tmp/student-cookies.txt -c /tmp/student-cookies.txt -L -X POST \
  http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=student@academy.guardianx.cloud&password=student123&csrfToken=${CSRF_STUDENT}&callbackUrl=http://localhost:3000/&json=true" \
  -o /dev/null -w "Login HTTP %{http_code}\n"

echo ""
echo "=== Verifying sessions ==="
echo "Admin session:"
curl -s -b /tmp/admin-cookies.txt http://localhost:3000/api/auth/session
echo ""
echo "Student session:"
curl -s -b /tmp/student-cookies.txt http://localhost:3000/api/auth/session
echo ""

echo ""
echo "=== RBAC Test 1: GET /api/admin/users (ADMIN should pass) ==="
RESP=$(curl -s -b /tmp/admin-cookies.txt -w "\n__HTTP__%{http_code}" http://localhost:3000/api/admin/users)
HTTP=$(echo "$RESP" | grep -o "__HTTP__[0-9]*" | tr -d '__HTTP__')
BODY=$(echo "$RESP" | sed 's/__HTTP__.*//')
echo "HTTP: $HTTP"
echo "Body (first 200 chars): ${BODY:0:200}"
echo ""

echo "=== RBAC Test 2: GET /api/admin/users (STUDENT should 403) ==="
RESP=$(curl -s -b /tmp/student-cookies.txt -w "\n__HTTP__%{http_code}" http://localhost:3000/api/admin/users)
HTTP=$(echo "$RESP" | grep -o "__HTTP__[0-9]*" | tr -d '__HTTP__')
BODY=$(echo "$RESP" | sed 's/__HTTP__.*//')
echo "HTTP: $HTTP (expect 403)"
echo "Body: $BODY"
echo ""

echo "=== RBAC Test 3: GET /api/admin/instructors (ADMIN should pass) ==="
RESP=$(curl -s -b /tmp/admin-cookies.txt -w "\n__HTTP__%{http_code}" http://localhost:3000/api/admin/instructors)
HTTP=$(echo "$RESP" | grep -o "__HTTP__[0-9]*" | tr -d '__HTTP__')
BODY=$(echo "$RESP" | sed 's/__HTTP__.*//')
echo "HTTP: $HTTP"
echo "Body (first 200 chars): ${BODY:0:200}"
echo ""

echo "=== RBAC Test 4: GET /api/admin/instructors (INSTRUCTOR would also pass; STUDENT should 403) ==="
RESP=$(curl -s -b /tmp/student-cookies.txt -w "\n__HTTP__%{http_code}" http://localhost:3000/api/admin/instructors)
HTTP=$(echo "$RESP" | grep -o "__HTTP__[0-9]*" | tr -d '__HTTP__')
BODY=$(echo "$RESP" | sed 's/__HTTP__.*//')
echo "HTTP: $HTTP (expect 403)"
echo "Body: $BODY"
echo ""

echo "=== RBAC Test 5: POST /api/admin/leads (ADMIN should pass — bad body still 400, not 401/403) ==="
RESP=$(curl -s -b /tmp/admin-cookies.txt -X POST -w "\n__HTTP__%{http_code}" \
  -H "Content-Type: application/json" -d '{"name":"Test Lead From RBAC Verify"}' \
  http://localhost:3000/api/admin/leads)
HTTP=$(echo "$RESP" | grep -o "__HTTP__[0-9]*" | tr -d '__HTTP__')
BODY=$(echo "$RESP" | sed 's/__HTTP__.*//')
echo "HTTP: $HTTP (expect 201 — created)"
echo "Body (first 300 chars): ${BODY:0:300}"
echo ""

echo "=== RBAC Test 6: POST /api/admin/leads (STUDENT should 403) ==="
RESP=$(curl -s -b /tmp/student-cookies.txt -X POST -w "\n__HTTP__%{http_code}" \
  -H "Content-Type: application/json" -d '{"name":"Forbidden Lead"}' \
  http://localhost:3000/api/admin/leads)
HTTP=$(echo "$RESP" | grep -o "__HTTP__[0-9]*" | tr -d '__HTTP__')
BODY=$(echo "$RESP" | sed 's/__HTTP__.*//')
echo "HTTP: $HTTP (expect 403)"
echo "Body: $BODY"
echo ""

echo "=== RBAC Test 7: GET /api/admin/training-batches (ADMIN should pass) ==="
RESP=$(curl -s -b /tmp/admin-cookies.txt -w "\n__HTTP__%{http_code}" http://localhost:3000/api/admin/training-batches)
HTTP=$(echo "$RESP" | grep -o "__HTTP__[0-9]*" | tr -d '__HTTP__')
BODY=$(echo "$RESP" | sed 's/__HTTP__.*//')
echo "HTTP: $HTTP"
echo "Body (first 200 chars): ${BODY:0:200}"
echo ""

echo "=== RBAC Test 8: GET /api/admin/students (ADMIN should pass) ==="
RESP=$(curl -s -b /tmp/admin-cookies.txt -w "\n__HTTP__%{http_code}" http://localhost:3000/api/admin/students)
HTTP=$(echo "$RESP" | grep -o "__HTTP__[0-9]*" | tr -d '__HTTP__')
BODY=$(echo "$RESP" | sed 's/__HTTP__.*//')
echo "HTTP: $HTTP"
echo "Body (first 200 chars): ${BODY:0:200}"
echo ""

echo ""
echo "============================================================"
echo "FEATURE 1 — Mock exam engine: shuffle + score + hide-correct"
echo "============================================================"

echo ""
echo "=== Find a published exam to test ==="
EXAM_ID=$(curl -s -b /tmp/student-cookies.txt http://localhost:3000/api/exams | python3 -c "
import json,sys
d=json.load(sys.stdin)
exams=d.get('exams',[])
if not exams:
  print('')
else:
  print(exams[0]['id'])
" 2>/dev/null)
echo "First published exam ID: $EXAM_ID"

if [ -z "$EXAM_ID" ]; then
  echo "ERROR: no published exams found — cannot test exam engine. Make sure seed-exams has been run."
else
  echo ""
  echo "=== Test 1: Start exam (should shuffle questions + options) ==="
  curl -s -b /tmp/student-cookies.txt -X POST http://localhost:3000/api/exams/$EXAM_ID/start -o /tmp/start1.json -w "HTTP %{http_code}\n"
  echo "Question count + first question text from /start:"
  python3 -c "
import json
with open('/tmp/start1.json') as f: d=json.load(f)
qs=d.get('questions',[])
print('Returned', len(qs), 'questions')
if qs:
  print('Q0 text:', qs[0]['question'][:80])
  print('Q0 options:', qs[0]['options'])
  print('Q0 type:', qs[0]['type'])
  # Check that 'correctAnswer' is NOT leaked
  has_correct = any('correctAnswer' in q for q in qs)
  print('Has correctAnswer leaked?', has_correct)
" 2>&1

  echo ""
  echo "=== Test 2: Start exam AGAIN (different shuffle expected) ==="
  # First, void the previous in-progress attempt by submitting it
  ATTEMPT_ID=$(python3 -c "import json;print(json.load(open('/tmp/start1.json'))['attempt']['id'])" 2>/dev/null)
  echo "Attempt ID: $ATTEMPT_ID"
  echo "Submitting with all WRONG answers to clear the in-progress attempt..."
  # Submit answers with deliberately wrong selection for each question (e.g., always option 99 — out of range)
  python3 -c "
import json
with open('/tmp/start1.json') as f: d=json.load(f)
answers=[]
for q in d.get('questions',[]):
  # Pick a wrong answer: for mcq, pick the last option index + 99 (definitely wrong)
  # But isAnswerCorrect compares to the original correctAnswer index.
  # Since the shuffle maps displayed -> original, we just need to ensure our
  # selected index doesn't match the correct one. We don't know the correct
  # one, but we can submit selected: -1 (which will map to undefined -> wrong).
  answers.append({'questionId': q['id'], 'selected': -1})
print(json.dumps({'attemptId': d['attempt']['id'], 'answers': answers}))
" > /tmp/submit-payload.json 2>&1
  cat /tmp/submit-payload.json | head -c 500
  echo ""
  curl -s -b /tmp/student-cookies.txt -X POST http://localhost:3000/api/exams/$EXAM_ID/submit \
    -H "Content-Type: application/json" \
    -d @/tmp/submit-payload.json \
    -o /tmp/submit1.json -w "Submit HTTP %{http_code}\n"
  echo "Submit result:"
  python3 -c "
import json
with open('/tmp/submit1.json') as f: d=json.load(f)
a=d.get('attempt',{})
print('Status:', a.get('status'))
print('Score:', a.get('score'))
print('Total Q:', a.get('totalQuestions'))
print('Correct:', a.get('correctAnswers'))
print('Passed:', a.get('passed'))
ans=d.get('answers',[])
print('Returned', len(ans), 'graded answers')
wrong_correctanswer_leak=0
for a in ans:
  if not a.get('correct'):
    if a.get('correctAnswer') is not None:
      wrong_correctanswer_leak += 1
print('Wrong questions where correctAnswer leaked (expect 0):', wrong_correctanswer_leak)
correct_with_correctanswer=0
for a in ans:
  if a.get('correct') and a.get('correctAnswer') is not None:
    correct_with_correctanswer += 1
print('Correct questions with correctAnswer shown:', correct_with_correctanswer)
" 2>&1

  echo ""
  echo "=== Test 3: Start exam AGAIN (new attempt — different shuffle?) ==="
  curl -s -b /tmp/student-cookies.txt -X POST http://localhost:3000/api/exams/$EXAM_ID/start -o /tmp/start2.json -w "HTTP %{http_code}\n"
  python3 -c "
import json
with open('/tmp/start1.json') as f: d1=json.load(f)
with open('/tmp/start2.json') as f: d2=json.load(f)
q1=[q['question'] for q in d1.get('questions',[])]
q2=[q['question'] for q in d2.get('questions',[])]
print('Attempt 1 question order (first 80 chars):')
for q in q1: print(' -', q[:80])
print('Attempt 2 question order (first 80 chars):')
for q in q2: print(' -', q[:80])
same_order = q1 == q2
print('Same order?', same_order)
if not same_order:
  print('✓ Shuffle is working — questions are in different order across attempts')
else:
  print('⚠ Same order — shuffle may not be working (or only 1 question)')
opt1 = d1.get('questions',[{}])[0].get('options',[]) if d1.get('questions') else []
opt2 = d2.get('questions',[{}])[0].get('options',[]) if d2.get('questions') else []
print('Attempt 1 Q0 options:', opt1)
print('Attempt 2 Q0 options:', opt2)
# Note: options may match if first question happens to be the same question; check the ordering
if opt1 and opt2 and opt1 != opt2:
  print('✓ Option shuffle also working — same question, different option order')
" 2>&1

  echo ""
  echo "=== Test 4: Submit second attempt with all WRONG answers (should score 0) ==="
  ATTEMPT2_ID=$(python3 -c "import json;print(json.load(open('/tmp/start2.json'))['attempt']['id'])" 2>/dev/null)
  python3 -c "
import json
with open('/tmp/start2.json') as f: d=json.load(f)
answers=[]
for q in d.get('questions',[]):
  answers.append({'questionId': q['id'], 'selected': -1})
print(json.dumps({'attemptId': d['attempt']['id'], 'answers': answers}))
" > /tmp/submit-payload2.json
  curl -s -b /tmp/student-cookies.txt -X POST http://localhost:3000/api/exams/$EXAM_ID/submit \
    -H "Content-Type: application/json" \
    -d @/tmp/submit-payload2.json \
    -o /tmp/submit2.json -w "Submit HTTP %{http_code}\n"
  python3 -c "
import json
with open('/tmp/submit2.json') as f: d=json.load(f)
a=d.get('attempt',{})
print('Status:', a.get('status'))
print('Score:', a.get('score'), '(expect 0)')
print('Correct:', a.get('correctAnswers'), '(expect 0)')
print('Passed:', a.get('passed'), '(expect False)')
" 2>&1
fi

echo ""
echo "============================================================"
echo "Killing dev server"
echo "============================================================"
kill $DEV_PID 2>/dev/null
wait $DEV_PID 2>/dev/null
echo "Done."
