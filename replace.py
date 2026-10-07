with open('backend/app/solver.py', 'r') as f:
    lines = f.readlines()

with open('backend/app/solver_support_replacement.py', 'r') as f:
    repl = f.read()

new_content = "".join(lines[:13]) + repl + "\n" + "".join(lines[179:])

with open('backend/app/solver.py', 'w') as f:
    f.write(new_content)
