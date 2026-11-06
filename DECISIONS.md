# Decisions

## Prioritisation
Fixed the CI pipeline – Started by fixing a variable naming issue in the GitHub Actions workflow.

Set up pgAdmin – Added pgAdmin to make it easier to view and manage the database during development.

Set up the AI development environment – Prepared the project for AI-assisted development.

Improved request listing – Updated RequestsService.list() to reduce database queries and avoid the N+1 query problem.

Updated query invalidation – Added invalidateQueries after mutations to make sure the UI gets the latest data.

Created ClassificationService – Moved classification-related logic into a separate service to keep the code better organized.

Implemented classification history – Added the database changes and API logic needed to save and retrieve classification history.

Other improvements – Made some additional changes, fixed issues, and added tests where needed.

## Assumptions
- since no authentication is implmemented, requiest authentication validation is not required at this stage
- The keyword rules are fine as they are. I only moved them.
- History should stay even if the request is deleted.
- We should save every classify call, even if there is no `requestId`.

## Trade-offs
I used plain SQL with a join for the list query because it is easy to read. The downside is that TypeScript cannot check the column names.

ARRAY_AGG loads all notes for each request just to get the latest one. This may become inefficient if the number of notes grows.

After a status change or classification, the web app uses invalidateQueries to fetch the full list again. This can be improved by addling more complex implementation to data fetch logic.

Classification history stores its own copy of the original message. This means the history remains available even if the original request is deleted, but the same message is stored twice replicate the data.

My tests use mocks, so they can run without a database. However, they cannot confirm that the SQL works correctly

## Classification history scope

Every classify call now saves a record in the new `classifications` table. It stores the message, category, confidence, provider, timestamp, and `request_id` if available.

`GET /requests/history` returns the latest 100 records, newest first, with an optional category filter.

The `/history` page now shows the records in a table with a category dropdown. I also added loading, empty and error states.


## Stretch (if any)

Error handling: Fixed invalid input responses to return proper HTTP 400 errors.

## What you would do with more time

 - Currently, classification runs in the main request flow. If we integrate an AI-based classifier, it could increase response times while waiting for the classification to complete. I would move this process to a background worker using a queue. This would keep the API responsive while the worker handles classification asynchronously.

- Add pagination to `GET /requests` and history.