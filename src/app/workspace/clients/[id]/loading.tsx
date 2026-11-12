export default function ClientDetailLoading() {
  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-900 pb-24 pt-2 px-4 sm:px-6 lg:px-8 animate-pulse">
      <div className="w-full space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-9 w-44 rounded-xl bg-white border border-[#EAE5DA]" />
          <div className="h-5 w-36 rounded-lg bg-[#EAE5DA]/60" />
        </div>

        <div className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-7 border border-[#EAE5DA] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-200/70 shrink-0" />
            <div className="space-y-2.5">
              <div className="h-7 w-56 rounded-xl bg-slate-200/80" />
              <div className="h-4 w-44 rounded-lg bg-slate-200/60" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-11 w-52 rounded-2xl bg-white border border-[#EAE5DA]" />
            <div className="h-11 w-36 rounded-2xl bg-amber-200/60" />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx} className="h-24 rounded-2xl bg-[#FFFDF9] border border-[#EAE5DA]" />
          ))}
        </div>

        <div className="h-12 w-full rounded-2xl bg-white border border-[#EAE5DA]" />
        <div className="h-72 w-full rounded-3xl bg-[#FFFDF9] border border-[#EAE5DA]" />
      </div>
    </div>
  );
}
