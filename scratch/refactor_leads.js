const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../src/components/dashboard/lead-table.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Add states and handlers for Column Drag and Drop
const stateTarget = `  // Columns & Configurations state
  const [columns, setColumns] = useState<ColumnConfig[]>(INITIAL_COLUMNS);
  const [showManageCols, setShowManageCols] = useState(false);`;

const stateReplacement = `  // Columns & Configurations state
  const [columns, setColumns] = useState<ColumnConfig[]>(INITIAL_COLUMNS);
  const [showManageCols, setShowManageCols] = useState(false);
  const [draggedColIdx, setDraggedColIdx] = useState<number | null>(null);
  const [dragOverColIdx, setDragOverColIdx] = useState<number | null>(null);
  
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedColIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedColIdx !== index) {
      setDragOverColIdx(index);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedColIdx === null || draggedColIdx === index) return;
    const updated = [...columns];
    const draggedCol = updated[draggedColIdx];
    updated.splice(draggedColIdx, 1);
    updated.splice(index, 0, draggedCol);
    setColumns(updated);
    savePreferences(updated);
  };

  const handleDragEnd = () => {
    setDraggedColIdx(null);
    setDragOverColIdx(null);
  };`;

content = content.replace(stateTarget, stateReplacement);

// 2. Make Th headers draggable and style them
const thTarget = `                  {/* Dynamic Columns headers */}
                  {columns.map((col, idx) => col.visible && (
                    <MotionTh
                      key={col.id}
                      layoutId={\`header-\${col.id}\`}
                      className="py-4 px-4 font-bold relative group/header"
                    >`;

const thReplacement = `                  {/* Dynamic Columns headers */}
                  {columns.map((col, idx) => col.visible && (
                    <MotionTh
                      key={col.id}
                      layoutId={\`header-\${col.id}\`}
                      className={\`py-4 px-4 font-bold relative group/header cursor-grab active:cursor-grabbing transition-all select-none \${
                        draggedColIdx === idx ? 'opacity-40 bg-slate-100 dark:bg-zinc-900 border-dashed border border-orange-500' : ''
                      } \${
                        dragOverColIdx === idx ? 'border-l-2 border-l-orange-500' : ''
                      }\`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, idx)}
                    >`;

content = content.replace(thTarget, thReplacement);

// 3. Refactor dark colors to clean Light Mode classes
// Search box input
content = content.replace(
  `className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-900/60 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-all font-sans"`,
  `className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-300 dark:focus:border-zinc-700 transition-all font-sans"`
);

// Filters dropdown containers
content = content.replace(
  /bg-zinc-950\/40 border border-zinc-800 rounded-xl px-2\.5 py-1\.5/g,
  `bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5`
);

// Select dropdown font and background colors
content = content.replace(
  /className="bg-transparent text-\[11px\] font-semibold text-zinc-300 focus:outline-none cursor-pointer border-none"/g,
  `className="bg-transparent text-[11px] font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none cursor-pointer border-none"`
);
content = content.replace(
  /className="bg-zinc-950"/g,
  `className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-white"`
);

// Columns engine button trigger
content = content.replace(
  `className="px-3 py-1.5 text-xs bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-xl transition-all flex items-center gap-2"`,
  `className="px-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl transition-all flex items-center gap-2"`
);

// Popover Menu wrapper
content = content.replace(
  `className="absolute right-0 mt-2.5 w-72 max-h-[420px] overflow-y-auto z-50 rounded-2xl bg-zinc-950/95 border border-zinc-850 p-4 shadow-2xl backdrop-blur-md space-y-4"`,
  `className="absolute right-0 mt-2.5 w-72 max-h-[420px] overflow-y-auto z-50 rounded-2xl bg-white dark:bg-zinc-950/95 border border-slate-200 dark:border-zinc-850 p-4 shadow-xl dark:shadow-2xl backdrop-blur-md space-y-4 text-slate-800 dark:text-zinc-300"`
);

// Popover select layout and options
content = content.replace(
  `className="w-full bg-zinc-900 text-xs text-white rounded-lg p-1.5 border border-zinc-800"`,
  `className="w-full bg-slate-50 dark:bg-zinc-900 text-xs text-slate-800 dark:text-white rounded-lg p-1.5 border border-slate-200 dark:border-zinc-800"`
);
content = content.replace(
  `className="w-full bg-zinc-900 text-xs text-white rounded-lg p-1.5 border border-zinc-800 placeholder-zinc-650"`,
  `className="w-full bg-slate-50 dark:bg-zinc-900 text-xs text-slate-800 dark:text-white rounded-lg p-1.5 border border-slate-200 dark:border-zinc-800 placeholder-slate-400 dark:placeholder-zinc-600"`
);
content = content.replace(
  `className="w-full bg-zinc-900 text-xs text-white rounded-lg p-1.5 border border-zinc-800 placeholder-zinc-650"`,
  `className="w-full bg-slate-50 dark:bg-zinc-900 text-xs text-slate-800 dark:text-white rounded-lg p-1.5 border border-slate-200 dark:border-zinc-800 placeholder-slate-400 dark:placeholder-zinc-600"`
);

// Visible fields row toggles
content = content.replace(
  /w-full flex items-center justify-between p-1 hover:bg-zinc-900 rounded-lg text-xs text-zinc-300/g,
  `w-full flex items-center justify-between p-1 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-lg text-xs text-slate-700 dark:text-zinc-300`
);
content = content.replace(
  `border-zinc-750 bg-transparent text-transparent`,
  `border-slate-300 dark:border-zinc-750 bg-transparent text-transparent`
);

// Main grid table wrapper
content = content.replace(
  `className="w-full overflow-hidden border border-zinc-900 bg-zinc-950/30 rounded-2xl shadow-2xl relative transition-all"`,
  `className="w-full overflow-hidden border border-slate-200 dark:border-zinc-900 bg-white dark:bg-zinc-950/30 rounded-2xl shadow-xl dark:shadow-2xl relative transition-all"`
);

content = content.replace(
  `className="w-full text-left border-collapse text-zinc-300 table-fixed min-w-[1000px]"`,
  `className="w-full text-left border-collapse text-slate-700 dark:text-zinc-300 table-fixed min-w-[1000px]"`
);

content = content.replace(
  `className="border-b border-zinc-900 text-[10px] font-bold uppercase tracking-wider text-zinc-550 bg-zinc-950/40"`,
  `className="border-b border-slate-200 dark:border-zinc-900 text-[10px] font-bold uppercase tracking-wider text-slate-550 dark:text-zinc-550 bg-slate-50 dark:bg-zinc-950/40"`
);

// Lead Name sticky left header
content = content.replace(
  `className="py-4 px-4 font-bold sticky left-0 bg-[#0c0c0e] z-30 border-r border-zinc-900/60 shadow-[5px_0_10px_rgba(0,0,0,0.4)]"`,
  `className="py-4 px-4 font-bold sticky left-0 bg-white dark:bg-[#0c0c0e] z-30 border-r border-slate-200 dark:border-zinc-900/60 shadow-[5px_0_10px_rgba(0,0,0,0.02)] dark:shadow-[5px_0_10px_rgba(0,0,0,0.4)] text-slate-800 dark:text-white"`
);

// Sticky Right Actions header
content = content.replace(
  `className="py-4 px-4 text-right sticky right-0 bg-[#0c0c0e] border-l border-zinc-900/60 z-30 shadow-[-5px_0_10px_rgba(0,0,0,0.4)]"`,
  `className="py-4 px-4 text-right sticky right-0 bg-white dark:bg-[#0c0c0e] border-l border-slate-200 dark:border-zinc-900/60 z-30 shadow-[-5px_0_10px_rgba(0,0,0,0.02)] dark:shadow-[-5px_0_10px_rgba(0,0,0,0.4)] text-slate-800 dark:text-white"`
);

// Row item formatting
content = content.replace(
  `className={\`hover:bg-zinc-900/20 transition-all cursor-pointer group/row border-b border-zinc-900 \${
                          isSelected ? 'bg-zinc-900/30' : ''
                        }\`}`,
  `className={\`hover:bg-slate-50 dark:hover:bg-zinc-900/20 transition-all cursor-pointer group/row border-b border-slate-200 dark:border-zinc-900 \${
                          isSelected ? 'bg-slate-100 dark:bg-zinc-900/30' : ''
                        }\`}`
);

// Lead Name sticky left cell
content = content.replace(
  `className="py-3.5 px-4 sticky left-0 bg-[#0c0c0e] z-20 border-r border-zinc-900/60 shadow-[5px_0_10px_rgba(0,0,0,0.3)]"`,
  `className="py-3.5 px-4 sticky left-0 bg-white dark:bg-[#0c0c0e] z-20 border-r border-slate-200 dark:border-zinc-900/60 shadow-[5px_0_10px_rgba(0,0,0,0.02)] dark:shadow-[5px_0_10px_rgba(0,0,0,0.3)] text-slate-800 dark:text-zinc-300"`
);

content = content.replace(
  `className="font-black text-white group-hover/row:text-orange-400 transition-colors truncate block text-sm"`,
  `className="font-black text-slate-900 dark:text-white group-hover/row:text-orange-500 transition-colors truncate block text-sm"`
);

// Actions sticky cell body
content = content.replace(
  `className="py-3.5 px-4 text-right sticky right-0 bg-[#0c0c0e] border-l border-zinc-900/60 z-20 shadow-[-5px_0_10px_rgba(0,0,0,0.3)]" onClick={(e) => e.stopPropagation()}`,
  `className="py-3.5 px-4 text-right sticky right-0 bg-white dark:bg-[#0c0c0e] border-l border-slate-200 dark:border-zinc-900/60 z-20 shadow-[-5px_0_10px_rgba(0,0,0,0.02)] dark:shadow-[-5px_0_10px_rgba(0,0,0,0.3)]" onClick={(e) => e.stopPropagation()}`
);

content = content.replace(
  /border border-zinc-900 hover:border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-white transition-all/g,
  `border border-slate-200 dark:border-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700 bg-slate-50 dark:bg-zinc-950 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-all`
);

// Pagination footer
content = content.replace(
  `className="flex items-center justify-between mt-4 text-xs text-zinc-500 px-4 py-3 border-t border-zinc-900/40"`,
  `className="flex items-center justify-between mt-4 text-xs text-slate-500 dark:text-zinc-500 px-4 py-3 border-t border-slate-200 dark:border-zinc-900/40"`
);
content = content.replace(
  `border border-zinc-800 bg-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-900 hover:text-white transition-all`,
  `border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-zinc-900 hover:text-slate-800 dark:hover:text-white transition-all`
);

// Custom text input in table cell
content = content.replace(
  `className="bg-zinc-950/50 border border-transparent hover:border-zinc-800 focus:border-zinc-700 text-xs text-white p-1 rounded w-28 focus:outline-none"`,
  `className="bg-slate-50 dark:bg-zinc-950/50 border border-transparent hover:border-slate-300 dark:hover:border-zinc-800 focus:border-slate-400 dark:focus:border-zinc-700 text-xs text-slate-900 dark:text-white p-1 rounded w-28 focus:outline-none"`
);

// Custom dropdown select in cell
content = content.replace(
  `className="bg-zinc-950/80 border border-zinc-900 text-zinc-350 text-[11px] font-semibold rounded-lg px-2 py-1 focus:outline-none focus:border-zinc-800 cursor-pointer w-32 truncate"`,
  `className="bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-900 text-slate-700 dark:text-zinc-350 text-[11px] font-semibold rounded-lg px-2 py-1 focus:outline-none focus:border-slate-300 dark:focus:border-zinc-800 cursor-pointer w-32 truncate"`
);

// Kanban board view
content = content.replace(
  `className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-start overflow-x-auto pb-6"`,
  `className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-start overflow-x-auto pb-6 text-slate-800 dark:text-zinc-300"`
);

content = content.replace(
  `className="rounded-2xl border border-zinc-900 bg-zinc-950/20 p-3.5 space-y-3 shrink-0 min-w-[200px]"`,
  `className="rounded-2xl border border-slate-200 dark:border-zinc-900 bg-white dark:bg-zinc-950/20 p-3.5 space-y-3 shrink-0 min-w-[200px] shadow-sm"`
);

content = content.replace(
  `className="flex items-center justify-between pb-2 border-b border-zinc-900"`,
  `className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-900"`
);

content = content.replace(
  `className="text-xs font-black text-white uppercase tracking-wider"`,
  `className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider"`
);

content = content.replace(
  `className="text-[10px] font-bold text-zinc-650 bg-zinc-950 px-2 py-0.5 rounded-md"`,
  `className="text-[10px] font-bold text-slate-500 dark:text-zinc-650 bg-slate-50 dark:bg-zinc-950 px-2 py-0.5 rounded-md border border-slate-200 dark:border-zinc-900"`
);

content = content.replace(
  `className="py-8 text-center text-[10px] text-zinc-600 italic border border-dashed border-zinc-900 rounded-xl"`,
  `className="py-8 text-center text-[10px] text-slate-400 dark:text-zinc-600 italic border border-dashed border-slate-200 dark:border-zinc-900 rounded-xl"`
);

// Kanban stage cards
content = content.replace(
  `className="p-3 rounded-xl border border-zinc-900 hover:border-zinc-800 bg-zinc-950/70 hover:bg-zinc-950 hover:scale-[1.01] cursor-pointer transition-all space-y-3 relative group"`,
  `className="p-3 rounded-xl border border-slate-200 dark:border-zinc-900 hover:border-slate-350 dark:hover:border-zinc-800 bg-slate-50 dark:bg-zinc-950/70 hover:bg-slate-100 dark:hover:bg-zinc-950 hover:scale-[1.01] cursor-pointer transition-all space-y-3 relative group shadow-sm"`
);

content = content.replace(
  `className="text-xs font-bold text-white block truncate"`,
  `className="text-xs font-bold text-slate-800 dark:text-white block truncate"`
);

content = content.replace(
  `className="text-[9px] text-zinc-650 block mt-1"`,
  `className="text-[9px] text-slate-400 dark:text-zinc-650 block mt-1"`
);

content = content.replace(
  `className="space-y-1 text-[10px] text-zinc-550 border-t border-zinc-900 pt-2 font-mono"`,
  `className="space-y-1 text-[10px] text-slate-500 dark:text-zinc-550 border-t border-slate-200 dark:border-zinc-900 pt-2 font-mono"`
);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('LeadTable component refactored successfully.');
