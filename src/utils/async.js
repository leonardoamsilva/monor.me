export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, Number(ms) || 0));
  });
}

export async function withMinDelay(task, minMs = 450) {
  const startedAt = Date.now();

  try {
    return await task();
  } finally {
    const elapsed = Date.now() - startedAt;
    const remaining = minMs - elapsed;
    if (remaining > 0) {
      await sleep(remaining);
    }
  }
}
