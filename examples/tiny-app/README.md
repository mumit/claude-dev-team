# Tiny App Example

A minimal Node project used to dogfood `claude-dev-team` installation and
pipeline commands against a real target layout.

```bash
# Install and verify
npm test                                       # run the tiny-app's own tests

# Bootstrap (from the claude-dev-team root)
bash ../../bootstrap.sh .                      # bash bootstrap (requires rsync)
# or: node ../../scripts/bootstrap.js .        # Node bootstrap (no rsync needed)

# Scaffold a new pipeline run and check the prompt
npm run pipeline:scaffold -- "Add health endpoint"
```
