import { useEffect, useMemo, useRef, useState } from "react";

const COLS = 6;
const ROWS = 12;
const COLORS = ["red", "green", "blue", "yellow"];

function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function createPair() {
  return {
    pivot: { x: 2, y: 1, color: randomColor() },
    child: { x: 2, y: 0, color: randomColor() },
    orientation: 0, // 0:上 1:右 2:下 3:左
  };
}

function getChildPosition(pivot, orientation) {
  if (orientation === 0) return { x: pivot.x, y: pivot.y - 1 };
  if (orientation === 1) return { x: pivot.x + 1, y: pivot.y };
  if (orientation === 2) return { x: pivot.x, y: pivot.y + 1 };
  return { x: pivot.x - 1, y: pivot.y };
}

function isInside(x, y) {
  return x >= 0 && x < COLS && y >= 0 && y < ROWS;
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function isFree(board, x, y) {
  return isInside(x, y) && board[y][x] === null;
}

function canPlacePair(board, pair) {
  const childPos = getChildPosition(pair.pivot, pair.orientation);
  return (
    isFree(board, pair.pivot.x, pair.pivot.y) &&
    isFree(board, childPos.x, childPos.y)
  );
}

function movePair(board, pair, dx, dy) {
  const nextPivot = {
    ...pair.pivot,
    x: pair.pivot.x + dx,
    y: pair.pivot.y + dy,
  };
  const nextChild = getChildPosition(nextPivot, pair.orientation);

  if (
    isFree(board, nextPivot.x, nextPivot.y) &&
    isFree(board, nextChild.x, nextChild.y)
  ) {
    return { ...pair, pivot: nextPivot };
  }

  return pair;
}

function rotatePair(board, pair) {
  const nextOrientation = (pair.orientation + 1) % 4;

  const tryPositions = [
    { x: pair.pivot.x, y: pair.pivot.y },
    { x: pair.pivot.x - 1, y: pair.pivot.y },
    { x: pair.pivot.x + 1, y: pair.pivot.y },
    { x: pair.pivot.x, y: pair.pivot.y - 1 },
  ];

  for (const pos of tryPositions) {
    const nextChild = getChildPosition(pos, nextOrientation);
    if (
      isFree(board, pos.x, pos.y) &&
      isFree(board, nextChild.x, nextChild.y)
    ) {
      return {
        ...pair,
        pivot: { ...pair.pivot, x: pos.x, y: pos.y },
        orientation: nextOrientation,
      };
    }
  }

  return pair;
}

function lockPair(board, pair) {
  const next = cloneBoard(board);
  const childPos = getChildPosition(pair.pivot, pair.orientation);

  if (isInside(pair.pivot.x, pair.pivot.y)) {
    next[pair.pivot.y][pair.pivot.x] = pair.pivot.color;
  }
  if (isInside(childPos.x, childPos.y)) {
    next[childPos.y][childPos.x] = pair.child.color;
  }

  return next;
}

function applyGravity(board) {
  const next = createEmptyBoard();

  for (let x = 0; x < COLS; x++) {
    let writeY = ROWS - 1;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (board[y][x] !== null) {
        next[writeY][x] = board[y][x];
        writeY--;
      }
    }
  }

  return next;
}

function findGroups(board) {
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const groups = [];
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const color = board[y][x];
      if (!color || visited[y][x]) continue;

      const stack = [[x, y]];
      const group = [];
      visited[y][x] = true;

      while (stack.length > 0) {
        const [cx, cy] = stack.pop();
        group.push([cx, cy]);

        for (const [dx, dy] of directions) {
          const nx = cx + dx;
          const ny = cy + dy;

          if (!isInside(nx, ny)) continue;
          if (visited[ny][nx]) continue;
          if (board[ny][nx] !== color) continue;

          visited[ny][nx] = true;
          stack.push([nx, ny]);
        }
      }

      if (group.length >= 4) {
        groups.push(group);
      }
    }
  }

  return groups;
}

function removeGroups(board, groups) {
  const next = cloneBoard(board);
  let removedCount = 0;

  for (const group of groups) {
    for (const [x, y] of group) {
      if (next[y][x] !== null) {
        next[y][x] = null;
        removedCount++;
      }
    }
  }

  return { board: next, removedCount };
}

function resolveChains(board) {
  let current = cloneBoard(board);
  let totalRemoved = 0;
  let chain = 0;

  while (true) {
    current = applyGravity(current);
    const groups = findGroups(current);

    if (groups.length === 0) break;

    chain++;
    const result = removeGroups(current, groups);
    current = result.board;
    totalRemoved += result.removedCount;
  }

  const score = totalRemoved * 10 * Math.max(chain, 1);
  return { board: current, chain, score };
}

function getColorStyle(color) {
  if (color === "red") return { background: "#ef4444" };
  if (color === "green") return { background: "#22c55e" };
  if (color === "blue") return { background: "#3b82f6" };
  if (color === "yellow") return { background: "#facc15" };
  return { background: "#1f2937" };
}

function Cell({ color }) {
  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        border: "1px solid rgba(255,255,255,0.15)",
        boxSizing: "border-box",
        ...getColorStyle(color),
      }}
    />
  );
}

export default function App() {
  const [board, setBoard] = useState(createEmptyBoard());
  const [pair, setPair] = useState(createPair());
  const [nextPair, setNextPair] = useState(createPair());
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [softDrop, setSoftDrop] = useState(false);
  const [chainText, setChainText] = useState("");

  const boardRef = useRef(board);
  const pairRef = useRef(pair);
  const nextPairRef = useRef(nextPair);
  const runningRef = useRef(running);
  const gameOverRef = useRef(gameOver);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    pairRef.current = pair;
  }, [pair]);

  useEffect(() => {
    nextPairRef.current = nextPair;
  }, [nextPair]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  function restartGame() {
    const first = createPair();
    const second = createPair();
    setBoard(createEmptyBoard());
    setPair(first);
    setNextPair(second);
    setScore(0);
    setRunning(true);
    setGameOver(false);
    setSoftDrop(false);
    setChainText("");
  }

  function spawnNext(currentBoard) {
    const source = nextPairRef.current;
    const spawned = {
      pivot: { x: 2, y: 1, color: source.pivot.color },
      child: { x: 2, y: 0, color: source.child.color },
      orientation: 0,
    };

    setNextPair(createPair());

    if (!canPlacePair(currentBoard, spawned)) {
      setGameOver(true);
      setRunning(false);
      return null;
    }

    return spawned;
  }

  function gameStep() {
    if (!runningRef.current || gameOverRef.current) return;

    const currentBoard = boardRef.current;
    const currentPair = pairRef.current;
    const moved = movePair(currentBoard, currentPair, 0, 1);

    if (moved !== currentPair) {
      setPair(moved);
      return;
    }

    const lockedBoard = lockPair(currentBoard, currentPair);
    const resolved = resolveChains(lockedBoard);

    setBoard(resolved.board);

    if (resolved.score > 0) {
      setScore((prev) => prev + resolved.score);

      if (resolved.chain >= 2) {
        setChainText(`${resolved.chain}れんさ！`);
        setTimeout(() => {
          setChainText("");
        }, 800);
      }
    }

    const spawned = spawnNext(resolved.board);
    if (spawned) {
      setPair(spawned);
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      gameStep();
    }, softDrop ? 70 : 700);

    return () => clearInterval(interval);
  }, [softDrop]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key.toLowerCase() === "r") {
        restartGame();
        return;
      }

      if (e.key.toLowerCase() === "p") {
        if (!gameOverRef.current) {
          setRunning((prev) => !prev);
        }
        return;
      }

      if (gameOverRef.current || !runningRef.current) return;

      const currentBoard = boardRef.current;

      if (e.key === "ArrowLeft") {
        setPair((prev) => movePair(currentBoard, prev, -1, 0));
      } else if (e.key === "ArrowRight") {
        setPair((prev) => movePair(currentBoard, prev, 1, 0));
      } else if (e.key === "ArrowUp" || e.key === " ") {
        setPair((prev) => rotatePair(currentBoard, prev));
      } else if (e.key === "ArrowDown") {
        setSoftDrop(true);
      }
    }

    function handleKeyUp(e) {
      if (e.key === "ArrowDown") {
        setSoftDrop(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const displayBoard = useMemo(() => {
    const next = cloneBoard(board);

    if (!gameOver && pair) {
      const childPos = getChildPosition(pair.pivot, pair.orientation);

      if (isInside(pair.pivot.x, pair.pivot.y)) {
        next[pair.pivot.y][pair.pivot.x] = pair.pivot.color;
      }
      if (isInside(childPos.x, childPos.y)) {
        next[childPos.y][childPos.x] = pair.child.color;
      }
    }

    return next;
  }, [board, pair, gameOver]);

  const nextDisplay = useMemo(() => {
    const mini = Array.from({ length: 3 }, () => Array(3).fill(null));
    mini[1][1] = nextPair.pivot.color;
    mini[0][1] = nextPair.child.color;
    return mini;
  }, [nextPair]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
        color: "#fff",
        padding: 24,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <h1 style={{ fontSize: 40, marginBottom: 8 }}>ぷよぷよ風ゲーム</h1>
        <p style={{ color: "#cbd5e1", marginBottom: 24 }}>
          同じ色を4つ以上つなげて消そう。連鎖すると高得点です。
        </p>

        <div
          style={{
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 20,
              padding: 20,
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 16,
                gap: 24,
              }}
            >
              <div>
                <div style={{ color: "#94a3b8", fontSize: 13 }}>SCORE</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{score}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#94a3b8", fontSize: 13 }}>STATUS</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>
                  {gameOver ? "GAME OVER" : running ? "PLAYING" : "PAUSED"}
                </div>
                <div style={{ color: "#67e8f9", minHeight: 24, marginTop: 4 }}>
                  {chainText}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${COLS}, 34px)`,
                gap: 4,
                background: "#020617",
                padding: 12,
                borderRadius: 16,
              }}
            >
              {displayBoard.flatMap((row, y) =>
                row.map((cell, x) => <Cell key={`${x}-${y}`} color={cell} />)
              )}
            </div>
          </div>

          <div
            style={{
              minWidth: 220,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 20,
                padding: 20,
              }}
            >
              <div style={{ marginBottom: 10, color: "#94a3b8" }}>NEXT</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 34px)",
                  gap: 4,
                }}
              >
                {nextDisplay.flatMap((row, y) =>
                  row.map((cell, x) => <Cell key={`next-${x}-${y}`} color={cell} />)
                )}
              </div>
            </div>

            <div
              style={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 20,
                padding: 20,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 12 }}>操作</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button
                  onClick={() => setPair((prev) => movePair(boardRef.current, prev, -1, 0))}
                  style={buttonStyle}
                >
                  ← 左
                </button>
                <button
                  onClick={() => setPair((prev) => movePair(boardRef.current, prev, 1, 0))}
                  style={buttonStyle}
                >
                  右 →
                </button>
                <button
                  onClick={() => setPair((prev) => rotatePair(boardRef.current, prev))}
                  style={buttonStyle}
                >
                  回転
                </button>
                <button
                  onMouseDown={() => setSoftDrop(true)}
                  onMouseUp={() => setSoftDrop(false)}
                  onMouseLeave={() => setSoftDrop(false)}
                  onTouchStart={() => setSoftDrop(true)}
                  onTouchEnd={() => setSoftDrop(false)}
                  style={buttonStyle}
                >
                  ↓ 落下
                </button>
              </div>

              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                <button
                  onClick={() => !gameOver && setRunning((prev) => !prev)}
                  style={buttonStyle}
                >
                  {running ? "一時停止" : "再開"}
                </button>
                <button onClick={restartGame} style={buttonStyle}>
                  リスタート
                </button>
              </div>
            </div>

            <div
              style={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 20,
                padding: 20,
                color: "#cbd5e1",
                lineHeight: 1.8,
                fontSize: 14,
              }}
            >
              <div style={{ fontWeight: 700, color: "#fff", marginBottom: 8 }}>
                キーボード操作
              </div>
              <div>← → : 移動</div>
              <div>↑ / Space : 回転</div>
              <div>↓ : 高速落下</div>
              <div>P : 一時停止</div>
              <div>R : リスタート</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const buttonStyle = {
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "#1e293b",
  color: "#fff",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};