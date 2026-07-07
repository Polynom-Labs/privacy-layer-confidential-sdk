export const DataSourceLegend = () => {
  const items = [
    {
      label: 'Production',
      className: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
      description: 'Live data from backend, chain sync, or wallet flows',
    },
    {
      label: 'Doc fixture',
      className: 'bg-amber-500/10 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
      description: 'Hardcoded values in how-to Seed state blocks only',
    },
    {
      label: 'SDK auto',
      className: 'bg-[#2563EB]/10 text-[#2563EB] dark:bg-[#2563EB]/20 dark:text-[#93C5FD]',
      description: 'Written by SDK after successful execute',
    },
  ];

  return (
    <div className="not-prose my-4 flex flex-wrap gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex min-w-[200px] flex-1 flex-col gap-1 rounded-lg bg-zinc-50 px-4 py-3 dark:bg-white/[0.03]"
        >
          <span
            className={`inline-flex w-fit rounded-md px-2 py-0.5 text-xs font-medium ${item.className}`}
          >
            {item.label}
          </span>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">{item.description}</span>
        </div>
      ))}
    </div>
  );
};
