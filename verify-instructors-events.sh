#!/usr/bin/env bash
# Verify INSTRUCTORS-EVENTS features: public instructors page + detail page,
# public events page + detail page, against the live dev server.
set -uo pipefail

cd /home/z/my-project

echo "==> 1. Cleaning tool-results temp files"
find tool-results -name ".*" -type f -delete 2>/dev/null || true

echo "==> 2. Killing any stale dev servers"
pkill -f "next dev" 2>/dev/null || true
sleep 2

echo "==> 3. Starting dev server on port 3000"
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
export NEXTAUTH_URL='http://localhost:3000'
( ./node_modules/.bin/next dev -p 3000 > /home/z/my-project/dev.log 2>&1 ) &
DEV_PID=$!
echo "  dev server PID: $DEV_PID"

echo "==> 4. Waiting for dev server to be ready"
for i in $(seq 1 60); do
  if curl -sf -o /dev/null http://localhost:3000/ 2>/dev/null; then
    echo "  dev server up after ${i}s"
    break
  fi
  sleep 1
done

echo "==> 5. Warming API routes (curl)"
echo "--- /api/instructors ---"
curl -s -o /dev/null -w "  HTTP %{http_code} in %{time_total}s\n" http://localhost:3000/api/instructors
INSTR_DATA=$(curl -s http://localhost:3000/api/instructors)
INSTR_COUNT=$(echo "$INSTR_DATA" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('count',0))" 2>/dev/null || echo "?")
INSTR_FIRST_ID=$(echo "$INSTR_DATA" | python3 -c "import sys,json; d=json.load(sys.stdin); ins=d.get('instructors',[]); print(ins[0]['id'] if ins else '')" 2>/dev/null || echo "")
echo "  instructors count: $INSTR_COUNT"
echo "  first instructor id: $INSTR_FIRST_ID"

echo "--- /api/instructors/<id> ---"
if [ -n "$INSTR_FIRST_ID" ]; then
  curl -s -o /dev/null -w "  HTTP %{http_code} in %{time_total}s\n" "http://localhost:3000/api/instructors/$INSTR_FIRST_ID"
fi

echo "--- /api/events ---"
curl -s -o /dev/null -w "  HTTP %{http_code} in %{time_total}s\n" http://localhost:3000/api/events
EVT_DATA=$(curl -s http://localhost:3000/api/events)
EVT_COUNT=$(echo "$EVT_DATA" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('count',0))" 2>/dev/null || echo "?")
EVT_FIRST_SLUG=$(echo "$EVT_DATA" | python3 -c "import sys,json; d=json.load(sys.stdin); evs=d.get('events',[]); print(evs[0]['slug'] if evs else '')" 2>/dev/null || echo "")
echo "  events count: $EVT_COUNT"
echo "  first event slug: $EVT_FIRST_SLUG"

echo "--- /api/events/<slug> ---"
if [ -n "$EVT_FIRST_SLUG" ]; then
  curl -s -o /dev/null -w "  HTTP %{http_code} in %{time_total}s\n" "http://localhost:3000/api/events/$EVT_FIRST_SLUG"
fi

echo ""
echo "==> 6. Browser verification with agent-browser"
export AGENT_BROWSER_SESSION="instructors-events-$$"
echo "  session: $AGENT_BROWSER_SESSION"

echo "--- open /#/instructors ---"
agent-browser open "http://localhost:3000/#/instructors" >/dev/null 2>&1
sleep 3
agent-browser wait --load networkidle >/dev/null 2>&1 || true
agent-browser snapshot -i -c 2>/dev/null | head -120
echo ""
echo "  --- read text ---"
agent-browser read 2>/dev/null | head -60
agent-browser screenshot /home/z/my-project/agent-ctx/instructors-list.png >/dev/null 2>&1 || true

echo ""
echo "--- open /#/instructor/<first-id> ---"
agent-browser open "http://localhost:3000/#/instructor/$INSTR_FIRST_ID" >/dev/null 2>&1
sleep 3
agent-browser wait --load networkidle >/dev/null 2>&1 || true
agent-browser snapshot -i -c 2>/dev/null | head -120
echo ""
echo "  --- read text ---"
agent-browser read 2>/dev/null | head -80
agent-browser screenshot /home/z/my-project/agent-ctx/instructor-detail.png >/dev/null 2>&1 || true

echo ""
echo "--- open /#/events ---"
agent-browser open "http://localhost:3000/#/events" >/dev/null 2>&1
sleep 3
agent-browser wait --load networkidle >/dev/null 2>&1 || true
agent-browser snapshot -i -c 2>/dev/null | head -120
echo ""
echo "  --- read text ---"
agent-browser read 2>/dev/null | head -80
agent-browser screenshot /home/z/my-project/agent-ctx/events-list.png >/dev/null 2>&1 || true

echo ""
echo "--- open /#/event/<first-slug> ---"
agent-browser open "http://localhost:3000/#/event/$EVT_FIRST_SLUG" >/dev/null 2>&1
sleep 3
agent-browser wait --load networkidle >/dev/null 2>&1 || true
agent-browser snapshot -i -c 2>/dev/null | head -120
echo ""
echo "  --- read text ---"
agent-browser read 2>/dev/null | head -80
agent-browser screenshot /home/z/my-project/agent-ctx/event-detail.png >/dev/null 2>&1 || true

echo ""
echo "==> 7. Closing browser + killing dev server"
agent-browser close >/dev/null 2>&1 || true
kill $DEV_PID 2>/dev/null || true
sleep 1
pkill -f "next dev" 2>/dev/null || true

echo ""
echo "==> 8. Dev log tail (most recent 80 lines)"
tail -80 /home/z/my-project/dev.log

echo ""
echo "==> DONE"
