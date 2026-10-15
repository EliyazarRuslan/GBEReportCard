export function ReportLoading({ label }: { label: string }) {
  return (
    <div className="text-center py-12">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[#C8A951]" />
      <p className="text-gray-500 mt-3">{label}</p>
    </div>
  );
}

export function ReportError({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
      {message}
    </div>
  );
}

export function PdfDownloadLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="bg-[#C8A951] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#B8953E] transition-colors flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {label}
    </a>
  );
}
