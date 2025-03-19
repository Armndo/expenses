## 0.2.0 (2025-03-19)

### Feat

- implemented incomes WIP, refactor expenses
- implemented app.yaml and .gcloudignore to serve in google app engine
- **expenseitem**: added confirm message before destroying expense (to prevent deletions in mobile)
- **mainview**: implemented change of date for expenses
- implemented ExpensesItem component, reduced ExpensesTable component
- **mainview**: componentization of expenses table and modal
- **mainview**: implementing fields for instalment expenses

## 0.1.0 (2025-02-24)

### Feat

- implemented commitizen versioning
- **functions**: minor corrections to autoRange and formatNumber params and code
- reworked MainView table, added simple mode, added new functions for number formatting
- changed token from session to local storage, implemented logout
- **mainview**: removed add expense button from table footer
- **mainview**: implemented modal for storing expenses
- **mainview**: implemented store, update and destroy expense requests
- **mainview**: implemented husk functionality to store, update and destroy expenses
- **mainview**: implemented tabulation and fetch of expenses per source
- **mainview**: implemented fetching of sources on loading view
- implemented login flow with redirection to MainView
- implemented router, implemented login views and first login and isLogged requests
- implemented relative paths/alias to project
- implemented deploy script
- implemented conventional commits

### Fix

- **mainview**: accidental removal of total amount of each source
