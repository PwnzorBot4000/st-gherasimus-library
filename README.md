# St. Gherasimus Library

Library management UI for St. Gherasimus public library.

## Code structure in /scripts

### Main stack
- ui - UI layer
- services - common services, used by both UI and API
- api - API layer
- data-access - data layer

### Supporting libraries
- external - external libraries
- utils.js - utility functions

## Backlog

- [ ] Save books to local storage (when database is stable enough)
- [ ] Add show/hide column ui
- [ ] Search by visible columns
- [ ] Add show book details ui
- [ ] Fix FUOC somehow, if a non-hack way exists
- [ ] Download xlsx functionality
- [ ] Test on Windows