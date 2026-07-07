export const LifecycleFlow = () => {
  const stages = [
    'validation',
    'stateRead',
    'authorization',
    'preparation',
    'policyCheck',
    'submission',
    'confirmation',
    'storageCommit',
  ];

  return (
    <div className="not-prose my-6 overflow-x-auto">
      <div className="flex min-w-[720px] items-center gap-1">
        {stages.map((stage, index) => (
          <div key={stage} className="flex flex-1 items-center gap-1">
            <div className="flex flex-1 flex-col items-center gap-1 rounded-md bg-zinc-50 px-2 py-2 dark:bg-white/[0.03]">
              <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {index + 1}
              </span>
              <span className="text-center text-xs font-medium text-zinc-800 dark:text-zinc-200">
                {stage}
              </span>
            </div>
            {index < stages.length - 1 ? (
              <span className="text-zinc-300 dark:text-zinc-600" aria-hidden="true">
                →
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        Progress event stages emitted during <code className="text-xs">execute()</code>, in order.
      </p>
    </div>
  );
};
