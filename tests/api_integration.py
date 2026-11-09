"""启动真实 C++ 服务，验证 Cookie 隔离、判题、错题复习和输入错误。"""

import http.cookiejar
import json
import pathlib
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request


def run(binary):
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
    base = f"http://127.0.0.1:{port}"
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
    )

    def request(path, data=None, status=200, client=opener):
        raw = json.dumps(data).encode() if data is not None else None
        req = urllib.request.Request(
            base + path, data=raw, headers={"Content-Type": "application/json"}
        )
        try:
            response = client.open(req, timeout=3)
        except urllib.error.HTTPError as error:
            response = error
        assert response.code == status, (path, response.code, response.read().decode())
        return json.load(response)

    with tempfile.TemporaryDirectory(prefix="englishword-api-") as directory:
        with tempfile.TemporaryFile() as logs:
            process = subprocess.Popen(
                [binary, "--port", str(port), "--database", str(pathlib.Path(directory) / "test.sqlite")],
                stdout=logs, stderr=logs,
            )
            try:
                for _ in range(100):
                    if process.poll() is not None:
                        logs.seek(0)
                        raise RuntimeError(logs.read().decode())
                    try:
                        request("/api/health")
                        break
                    except urllib.error.URLError:
                        time.sleep(0.05)
                else:
                    raise RuntimeError("Server startup timed out")

                book = request("/api/wordbooks")["items"][0]
                words = request(f"/api/wordbooks/{book['id']}/words")["items"]
                answers = {word["id"]: word["english"] for word in words}
                assert len(words) == 10
                request("/api/wordbooks/999999/words", status=404)
                request("/api/study", status=404)
                request("/api/study/start", {"wordbookId": book["id"], "mode": "bad"}, status=400)

                state = request("/api/study/start", {"wordbookId": book["id"], "mode": "spelling"})
                assert "english" not in state["question"]
                request("/api/study/next", {}, status=409)
                request("/api/study/answer", {"answer": 1}, status=400)
                request("/api/study/answer", {"answer": "  "}, status=400)
                state = request("/api/study/answer", {"answer": "not-a-word"})
                assert state["score"] == -10 and state["wrongCount"] == 1
                state = request("/api/study/answer", {"answer": answers[state["question"]["wordId"]]})
                assert state["score"] == -10 and state["canAdvance"]
                assert request("/api/study")["canAdvance"]
                request("/api/study", status=404, client=urllib.request.build_opener())

                while not state["finished"]:
                    if not state["canAdvance"]:
                        answer = answers[state["question"]["wordId"]]
                        state = request("/api/study/answer", {"answer": answer})
                        duplicate = request("/api/study/answer", {"answer": answer})
                        assert duplicate["score"] == state["score"]
                    state = request("/api/study/next", {})
                assert state["score"] == 80 and state["correctCount"] == 9
                state = request("/api/study/review", {})
                assert state["totalCount"] == 1 and state["mode"] == "spelling"
                request("/api/study/answer", {"answer": answers[state["question"]["wordId"]]})
                state = request("/api/study/next", {})
                assert state["finished"] and state["wrongCount"] == 0
                request("/api/study/review", {}, status=400)

                state = request("/api/study/start", {"wordbookId": book["id"], "mode": "choice"})
                assert len(state["question"]["choices"]) == 4
                assert answers[state["question"]["wordId"]] in state["question"]["choices"]
                print("HTTP API integration passed.")
            finally:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()


if __name__ == "__main__":
    run(str(pathlib.Path(sys.argv[1]).resolve()))
