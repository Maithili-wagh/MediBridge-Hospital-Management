function formatCell(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value?.name) return value.name;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
  return value || "-";
}

export default function DataTable({ title, rows = [], columns, action }) {
  return (
    <div className="panel table-panel">
      <h2>{title}</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
              {action && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr key={row._id || index}>
                  {columns.map((column) => (
                    <td key={column}>
                      {column.toLowerCase().includes("status") ? (
                        <span className={`status-pill status-${String(row[column] || "").replaceAll("_", "-")}`}>
                          {formatCell(row[column]).replaceAll("_", " ")}
                        </span>
                      ) : formatCell(row[column])}
                    </td>
                  ))}
                  {action && <td>{action(row)}</td>}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + (action ? 1 : 0)}>No records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
