## 📋 Story

Closes #[story-id]

**Sprint Goal connection:** [How does this story contribute to the Sprint Goal?]

## 🔄 Changes

- [Change 1]
- [Change 2]

## 🧪 How to Test

```bash
# Specific test steps
docker compose up -d
curl -X POST http://localhost:3000/render \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello Test"}'
# Expected: 202 {"job_id": "..."}
```

## ✅ Checklist

- [ ] Tests pass locally
- [ ] No console.log left in code
- [ ] Env vars documented
- [ ] Error cases handled
- [ ] Definition of Done met
