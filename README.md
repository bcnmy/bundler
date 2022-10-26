# Relayer Node Service

## Workflow best practices

### Branching

This project has two main branches, `main`, and `dev`. Then we do work based on branches off of `dev`.

`main`: Production branch. This is code that's live for the project.  
`dev`: Staging branch. This represents what will be included in the next release.

As we work on features, we branch off of the `dev` branch: `git checkout -b feature/new-nav-bar`.

Working branches have the form `<type>/<feature>` where `type` is one of:

- feat
- fix
- hotfix
- chore
- refactor

### Commit Messages

#### Basic

`<jira-issue-id> <type>(<scope>):<subject>`

Your basic commit messages should have a **jira-issue-id**, **type**, **scope**, and **subject**:

- _Jira-issue-id_ is the key in Jira issue, e.g., CORE-1_
- _Type_ is one of the types listed above
- _Scope_ is the area of the code that the commit changes
- _Subject_ is a brief description of the work completed

#### Full

```
# <type>(<scope>): <subject>

# Why was this necessary?
# How does this address the issue?
# What side effects does this change have?
```