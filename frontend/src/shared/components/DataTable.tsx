import type { ReactNode } from 'react'

export type Column<T> = {
  key: string
  header: ReactNode
  headerGroup?: string
  align?: 'left' | 'center' | 'right'
  render: (row: T) => ReactNode
}

type DataTableProps<T> = {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  emptyMessage?: string
}

export function DataTable<T>({ columns, rows, rowKey, emptyMessage = 'No records found.' }: DataTableProps<T>) {
  const hasGroupedHeaders = columns.some((column) => column.headerGroup)
  const alignClass = (align: Column<T>['align']) => align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'

  return (
    <div className="overflow-x-auto rounded-xl border border-[#cbded6] bg-white/70">
      <table className="w-full border-collapse text-[13px]">
        <colgroup>
          {columns.map((column) => <col key={column.key} className={column.headerGroup ? 'w-16' : undefined} />)}
        </colgroup>
        <thead className="bg-[linear-gradient(100deg,#d1e9e0,#e5f2ec_58%,#efe0bc)]">
          <tr>
            {columns.map((column, index) => {
              if (column.headerGroup && columns[index - 1]?.headerGroup === column.headerGroup) return null
              if (column.headerGroup) {
                const colSpan = columns.slice(index).findIndex((candidate) => candidate.headerGroup !== column.headerGroup)
                return <th key={`group-${column.headerGroup}`} colSpan={colSpan === -1 ? columns.length - index : colSpan} className="border-b border-[#bfd5cc] px-1 py-1.5 text-center text-[12px] leading-4 font-semibold tracking-[.07em] text-[#315f5c] uppercase">{column.headerGroup}</th>
              }
              return <th key={column.key} rowSpan={hasGroupedHeaders ? 2 : 1} className={`border-b border-[#bfd5cc] px-3 py-3 align-middle text-[12px] leading-4 font-semibold tracking-[.07em] text-[#315f5c] uppercase ${alignClass(column.align)}`}>{column.header}</th>
            })}
          </tr>
          {hasGroupedHeaders && <tr>
            {columns.filter((column) => column.headerGroup).map((column) => <th key={column.key} className={`border-b border-l border-[#bfd5cc] px-1 py-1.5 text-[12px] leading-4 font-semibold tracking-[.04em] text-[#315f5c] uppercase first:border-l-0 ${alignClass(column.align)}`}>{column.header}</th>)}
          </tr>}
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td className="p-9 text-center text-[#71817e]" colSpan={columns.length}>{emptyMessage}</td></tr>
          ) : rows.map((row) => (
            <tr className="transition-colors last:[&>td]:border-b-0 hover:bg-[#eaf4ef]" key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.key} className={`border-b border-[#dce8e3] py-3.5 ${column.headerGroup ? 'px-1' : 'px-3'} ${alignClass(column.align)}`}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
