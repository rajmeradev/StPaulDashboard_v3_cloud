function MaterialRequirements({ data }) {
  const formatNumber = (num) => {
    return num?.toLocaleString('en-US', { maximumFractionDigits: 0 }) || '0'
  }

  if (!data) return null

  const rows = [
    { label: 'Gallons', key: 'gallons' },
    { label: 'Pounds', key: 'pounds' },
    { label: 'High Fat Req (lbs)', key: 'highFatReqLbs' },
    { label: 'Skim Req (lbs)', key: 'skimReqLbs' }
  ]

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Material Requirements</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-2 px-3">Metric</th>
              <th className="text-right py-2 px-3">Line 1</th>
              <th className="text-right py-2 px-3">Line 2</th>
              <th className="text-right py-2 px-3 font-bold">Combined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.key} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                <td className="py-2 px-3">{row.label}</td>
                <td className="text-right py-2 px-3">{formatNumber(data.line1[row.key])}</td>
                <td className="text-right py-2 px-3">{formatNumber(data.line2[row.key])}</td>
                <td className="text-right py-2 px-3 font-bold">{formatNumber(data.combined[row.key])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default MaterialRequirements
