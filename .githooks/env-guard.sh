#!/bin/sh
# Shared helper: reads file paths on stdin, prints any that are env files.
grep -E '(^|/)(\.env(\..+)?|[^/]+\.env)$' | grep -vE '(^|/)\.env\.example$'
