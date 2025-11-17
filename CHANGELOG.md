## 0.4.0 (2025-11-17)

### Feat

- **overviewmodal**: implemented charts by amount or expenses, fixed barchart tooltip
- refactor readability of ExpenseItem, added unique keys to all mapped components
- wIP implementing OverviewModal
- **loginview**: added media queries to change width of login inputs
- **expensemodal**: added more validation and icons to make it look less empty
- fixed styles to match cellphone landscape and portrait
- **package.json**: changed deploy script
- **mainview**: changed "index" request to make it work with refactor
- **expensestable**: added alias (emoji) instead of name of category
- added categories to expensestable, to expenseitem, and send to backend
- **expensemodal**: adding category dropwdown for adding expenses
- **expensemodal**: media query for cellphone size for modal
- **expensesmodal**: added label in order to show the selected item
- **expensestable**: responsive table now working in both desktop and phone
- **expensestable**: reworked cell size for minimum width, added SimpleItem component for simple

### Fix

- changed empty endpoint to avoid CORS error
- **expensestable**: corrected overflow so it doesnt show up double, nor when it's not needed (auto)

## 0.3.0 (2025-07-06)

### Feat

- **mainview**: added variable to store date of last update/create
- **loader**: revamoed login loader and mainview loader
- **expensemodal**: revamped modal and form, improved colors
- **expresstable**: removed footer, added footer fields as chips
- **expensetable**: implemented MUI for ExpenseTable and ExpenseItem
- **mainview**: added card style for expenses table
- **loginview**: implemented mui login
- **loginview**: implementing better UI (WIP)

### Fix

- **expenseitem**: source_id wasn't being used when editing expense

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
