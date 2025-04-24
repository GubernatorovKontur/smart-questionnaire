const { Button, Gapped, Loader, Textarea } = ReactUI;

const Log = ({ logEntries, copyLog, clearLog, sendToGoogleSheets, exportToCSV, loading }) => (
  <Gapped vertical gap={20}>
    <Gapped gap={10}>
      <Button use="primary" onClick={copyLog}>Скопировать лог</Button>
      <Button use="primary" onClick={clearLog}>Очистить лог</Button>
      <Button use="primary" onClick={sendToGoogleSheets} disabled={loading}>
        {loading ? <Loader /> : "Отправить в Google Таблицы"}
      </Button>
      <Button use="primary" onClick={exportToCSV}>Экспорт в CSV</Button>
    </Gapped>
    <Textarea value={logEntries.join("\n")} readOnly style={{ minHeight: '200px' }} />
  </Gapped>
);

export default Log;
