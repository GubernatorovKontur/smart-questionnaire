const { useState, useEffect } = React;
import ClientData from './components/ClientData.jsx';
import CompanyDemo from './components/CompanyDemo.jsx';
import Questionnaire from './components/Questionnaire.jsx';
import Log from './components/Log.jsx';
import questionnaireData from './data/questionnaire.json';
import { mockCompanyData } from './data/mockData.js';

const App = () => {
  const [lprName, setLprName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [mode, setMode] = useState("linear");
  const [currentQuestionId, setCurrentQuestionId] = useState("1");
  const [answers, setAnswers] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [logEntries, setLogEntries] = useState([]);
  const [history, setHistory] = useState([]);
  const [choiceHistory, setChoiceHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gapiReady, setGapiReady] = useState(false);
  const [userSignedIn, setUserSignedIn] = useState(false);

  // Инициализация Google API и OAuth 2.0
  useEffect(() => {
    window.gapi.load('client:auth2', () => {
      window.gapi.client.init({
        apiKey: 'YOUR_API_KEY', // Замените на ваш API-ключ
        clientId: 'YOUR_CLIENT_ID', // Замените на ваш Client ID
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
        scope: 'https://www.googleapis.com/auth/spreadsheets'
      }).then(() => {
        setGapiReady(true);
        const authInstance = window.gapi.auth2.getAuthInstance();
        setUserSignedIn(authInstance.isSignedIn.get());
        authInstance.isSignedIn.listen(setUserSignedIn);
      }).catch(error => {
        console.error('Ошибка инициализации Google API:', error);
        alert('Ошибка инициализации Google API');
      });
    });
  }, []);

  const signIn = () => {
    window.gapi.auth2.getAuthInstance().signIn();
  };

  const saveClientData = () => {
    const clientData = [];
    if (lprName || companyName || managerName) {
      clientData.push("--- Данные клиента ---");
      if (lprName) clientData.push(`Имя ЛПР: ${lprName}`);
      if (companyName) clientData.push(`Название компании: ${companyName}`);
      if (managerName) clientData.push(`Имя менеджера: ${managerName}`);
      setLogEntries(prev => [...clientData, ...prev]);
      setAnalytics(prev => [...prev, {
        timestamp: new Date().toISOString(),
        manager: managerName,
        question: "Данные клиента",
        answer: clientData.join(", ")
      }]);
      setLprName("");
      setCompanyName("");
      setManagerName("");
      alert("Данные клиента сохранены в лог!");
    } else {
      alert("Заполните хотя бы одно поле!");
    }
  };

  const copyLog = () => {
    const logText = logEntries.join("\n");
    navigator.clipboard.writeText(logText).then(() => alert("Лог скопирован!"));
  };

  const clearLog = () => {
    setLogEntries([]);
    setChoiceHistory([]);
    setHistory([]);
    setAnswers({});
    setRecommendations([]);
    setCurrentQuestionId("1");
    alert("Лог и история очищены!");
  };

  const sendToGoogleSheets = () => {
    if (!managerName) {
      alert("Введите имя менеджера!");
      return;
    }
    if (!gapiReady) {
      alert("Google API не инициализирован!");
      return;
    }
    if (!userSignedIn) {
      alert("Пожалуйста, авторизуйтесь через Google!");
      signIn();
      return;
    }
    setLoading(true);

    const values = [
      ['Менеджер', 'Время', 'Вопрос', 'Ответ'],
      ...analytics.map(a => [a.manager, a.timestamp, a.question, a.answer]),
      ['Рекомендации', '', '', ''],
      ...recommendations.map(r => ['', '', r, questionnaireData.recommendations[r]])
    ];

    window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: 'YOUR_SPREADSHEET_ID', // Замените на ID вашей Google Таблицы
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      resource: { values }
    }).then(() => {
      alert('Аналитика отправлена в Google Таблицы!');
      setLoading(false);
    }).catch(error => {
      console.error('Ошибка записи:', error);
      alert('Ошибка записи в Google Таблицы');
      setLoading(false);
    });
  };

  const goBack = () => {
    if (history.length > 0) {
      const lastQuestionId = history.pop();
      const lastChoice = choiceHistory.pop();
      setCurrentQuestionId(lastQuestionId);
      setLogEntries(prev => prev.slice(0, -1));
      setAnalytics(prev => prev.slice(0, -1));
      setChoiceHistory([...choiceHistory]);
      setHistory([...history]);
      setRecommendations(prev => prev.filter(rec => !lastChoice || !lastChoice.recommendation || rec !== lastChoice.recommendation));
    }
  };

  const revertToHistory = (index) => {
    const targetChoice = choiceHistory[index];
    setCurrentQuestionId(targetChoice.next);
    setLogEntries(prev => prev.slice(0, index + 1));
    setAnalytics(prev => prev.slice(0, index + 1));
    setChoiceHistory(prev => prev.slice(0, index + 1));
    setHistory(prev => prev.slice(0, index));
    setRecommendations(prev => {
      const newRecs = [];
      choiceHistory.slice(0, index + 1).forEach(choice => {
        const question = questionnaireData.questions.find(q => q.id === choice.questionId);
        const option = question.options.find(opt => opt.value === choice.answer);
        if (option.recommendation) newRecs.push(option.recommendation);
      });
      return [...new Set(newRecs)];
    });
  };

  return (
    <div className="container">
      <div className="left-panel">
        <div className="logo-container">
          <img src="https://via.placeholder.com/200x50?text=Контур.Фокус" alt="Логотип" className="logo" />
        </div>
        <h1>Данные клиента</h1>
        <ClientData
          lprName={lprName}
          setLprName={setLprName}
          companyName={companyName}
          setCompanyName={setCompanyName}
          managerName={managerName}
          setManagerName={setManagerName}
          saveClientData={saveClientData}
        />
        <h2>Демо компании</h2>
        <CompanyDemo />
      </div>
      <div className="main-window">
        <h1>Советник по Контур.Фокус</h1>
        <Questionnaire
          mode={mode}
          setMode={setMode}
          currentQuestionId={currentQuestionId}
          setCurrentQuestionId={setCurrentQuestionId}
          answers={answers}
          setAnswers={setAnswers}
          recommendations={recommendations}
          setRecommendations={setRecommendations}
          analytics={analytics}
          setAnalytics={setAnalytics}
          history={history}
          setHistory={setHistory}
          choiceHistory={choiceHistory}
          setChoiceHistory={setChoiceHistory}
          goBack={goBack}
          questionnaireData={questionnaireData}
          managerName={managerName}
          setLogEntries={setLogEntries}
        />
      </div>
      <div className="backup-window">
        <h2>Лог действий</h2>
        {!userSignedIn && (
          <Button use="primary" onClick={signIn}>Авторизоваться через Google</Button>
        )}
        <Log
          logEntries={logEntries}
          copyLog={copyLog}
          clearLog={clearLog}
          sendToGoogleSheets={sendToGoogleSheets}
          loading={loading}
        />
        <h2>История выборов</h2>
        <ul className="history-list">
          {choiceHistory.map((entry, index) => (
            <li key={index} onClick={() => revertToHistory(index)}>
              {entry.answer} (Этап {entry.questionId})
            </li>
          ))}
        </ul>
        <div className="author-info">
          <p>Инструмент подготовлен <a href="https://staff.skbkontur.ru/profile/gubernatorov" target="_blank">Губернаторовым Данилой Алексеевичем</a></p>
        </div>
      </div>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
