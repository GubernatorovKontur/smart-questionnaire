const { Input, Button, Gapped } = ReactUI;

const ClientData = ({ lprName, setLprName, companyName, setCompanyName, managerName, setManagerName, saveClientData }) => (
  <Gapped vertical gap={20}>
    <div>
      <label>Имя ЛПР:</label>
      <Input value={lprName} onValueChange={setLprName} placeholder="Введите имя ЛПР" />
    </div>
    <div>
      <label>Название компании:</label>
      <Input value={companyName} onValueChange={setCompanyName} placeholder="Введите название" />
    </div>
    <div>
      <label>Имя менеджера:</label>
      <Input value={managerName} onValueChange={setManagerName} placeholder="Введите имя менеджера" />
    </div>
    <Button use="primary" onClick={saveClientData}>Сохранить в лог</Button>
  </Gapped>
);

export default ClientData;
