# AI Usage

## Tools used

Claude Code in VS Code.

## How AI is used

First, i went through the exercise description and understood what needs to be done. 
Then i went through the codebase in high level, and got the understanding about the structure of the project.
Next, i could split the tasks in to individual smaller tasks and decided a plan to progress through them.

I noticed that this project environment isn't configured to support AI agents and their associated files.
So i created bare minimum AI suppporred files including skills to streamline the development throughout the exercise.

I used AI agents to complete smaller tasks by providing individual prompt. Where tasks were independent and could be handled simultaneously, I also used parallel execution to improve efficiency.

## What I changed or rejected

When setting up the AI environment, It first suggested a bigger setup with `AGENTS.md`, settings
and more skills, but that was too much for one assignment.
I kept the setup small: two skills in `.claude/skills`, one for back end and one for front end. They
have the repo rules and common mistakes. 

New packages: it added `class-validator` and `class-transformer` for the refactor. I told it to remove them and updated the `skills` to avoid adding additional dependencies to this assignment project.

pgAdmin: I configurted pgAdmin to make it easier to observe the db. its first version had saved servers, a password file, extra environment variables and a named volume. I cut it down to the small service now in `docker-compose.yml`.


## Trade-offs
With the help of AI, I could make more changes than you actually ask for. But for this exercise, I wanted to focus on how I work with AI to get things done. So I kept the scope fixed and made only the changes that were really needed.

## Team workflow (optional stretch)

For me, AI changes how we write code, not who is responsible for it. The person who opens the PR
should be able to explain every line. There is a longer list in
[docs/stretch-notes.md](docs/stretch-notes.md).
