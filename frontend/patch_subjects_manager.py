import re

with open('src/components/subjects-manager.tsx', 'r') as f:
    content = f.content = f.read()

# I will do this in multiple steps. Let's first inspect the exact boundaries of the table columns.
