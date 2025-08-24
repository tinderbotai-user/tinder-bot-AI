import os
import re
import sys

def detect_language(filename: str) -> str:
    """Guess the language for the code fence based on file extension."""
    ext = os.path.splitext(filename)[1].lower()
    mapping = {
        ".py": "python",
        ".js": "js",
        ".ts": "ts",
        ".java": "java",
        ".c": "c",
        ".cpp": "cpp",
        ".h": "c",
        ".html": "html",
        ".css": "css",
        ".json": "json",
        ".sh": "bash",
    }
    return mapping.get(ext, "")

def replace_links_with_codeblocks(md_text: str, base_dir: str) -> str:
    """
    Replace [text](path/to/file.ext) with fenced codeblocks containing file contents,
    if the path is a local file.
    """
    pattern = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")

    def replacer(match):
        link_text = match.group(1)
        path = match.group(2)

        # Skip if it's an URL (http, https, ftp, mailto, etc.)
        if re.match(r'^[a-zA-Z]+://', path) or path.startswith("mailto:"):
            return match.group(0)

        abs_path = os.path.normpath(os.path.join(base_dir, path))
        if not os.path.isfile(abs_path):
            return match.group(0)

        try:
            with open(abs_path, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception as e:
            return match.group(0)  # fallback if file can't be read

        lang = detect_language(path)
        return f"```{lang}\n{content}\n```"

    return pattern.sub(replacer, md_text)


def main():
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} INPUT.md OUTPUT.md")
        sys.exit(1)

    input_file, output_file = sys.argv[1], sys.argv[2]
    base_dir = os.path.dirname(os.path.abspath(input_file))

    with open(input_file, "r", encoding="utf-8") as f:
        md_text = f.read()

    new_text = replace_links_with_codeblocks(md_text, base_dir)

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(new_text)

if __name__ == "__main__":
    main()
