import os
import sys
import subprocess
import shutil

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    backend_dir = os.path.join(root_dir, "backend")
    src_tauri_binaries = os.path.join(root_dir, "src-tauri", "binaries")
    os.makedirs(src_tauri_binaries, exist_ok=True)

    # Determine binary name based on platform
    target_name = "backend-x86_64-pc-windows-msvc"
    if sys.platform == "darwin":
        import platform
        arch = "aarch64" if platform.machine() == "arm64" else "x86_64"
        target_name = f"backend-{arch}-apple-darwin"
    elif sys.platform.startswith("linux"):
        target_name = "backend-x86_64-unknown-linux-gnu"

    entrypoint = os.path.join(backend_dir, "run_server.py")
    distpath = src_tauri_binaries
    workpath = os.path.join(backend_dir, "build")

    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--onefile",
        "--noconsole",
        "--name",
        target_name,
        "--collect-all",
        "ortools",
        "--collect-all",
        "uvicorn",
        "--collect-all",
        "fastapi",
        "--distpath",
        distpath,
        "--workpath",
        workpath,
        "--specpath",
        backend_dir,
        entrypoint,
    ]

    print(f"Building sidecar: {' '.join(cmd)}")
    res = subprocess.run(cmd)
    if res.returncode != 0:
        print(f"PyInstaller failed with code {res.returncode}", file=sys.stderr)
        sys.exit(res.returncode)

    print(f"Sidecar successfully created in {distpath}")

if __name__ == "__main__":
    main()
