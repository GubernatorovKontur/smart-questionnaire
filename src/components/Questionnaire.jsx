const { Button, Select, Gapped } = ReactUI;

const Questionnaire = ({
  mode, setMode, currentQuestionId, setCurrentQuestionId, answers, setAnswers,
  recommendations, setRecommendations, analytics, setAnalytics, history, setHistory,
  choiceHistory, setChoiceHistory, goBack, questionnaireData, managerName, setLogEntries
}) => {
  const getQuestion = (id) => questionnaireData.questions.find(q => q.id === id);

  const handleAnswer = (questionId, answer, option) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    if (option.recommendation) {
      setRecommendations(prev => [...new Set([...prev, option.recommendation])]);
    }
    const analyticEntry = {
      timestamp: new Date().toISOString(),
      manager: managerName,
      question: getQuestion(questionId).text,
      answer: answer
    };
    setAnalytics(prev => [...prev, analyticEntry]);
    setHistory(prev => [...prev, currentQuestionId]);
    setChoiceHistory(prev => [...prev, { questionId, answer, next: option.next, log: option.log }]);
    setLogEntries(prev => [...prev, option.log]);
    if (option.next) {
      setCurrentQuestionId(option.next);
    } else if (recommendations.length === 0 && answers["1"]) {
      const position = answers["1"];
      const defaultRec = questionnaireData.defaultRecommendations[position];
      if (defaultRec) {
        setRecommendations([defaultRec]);
        setAnalytics(prev => [...prev, {
          timestamp: new Date().toISOString(),
          manager: managerName,
          question: "Default Recommendation",
          answer: questionnaireData.recommendations[defaultRec]
        }]);
        setLogEntries(prev => [...prev, `Default Recommendation: ${questionnaireData.recommendations[defaultRec]}`]);
      }
    }
  };

  const renderLinearMode = () => {
    const question = getQuestion(currentQuestionId);
    if (!question) return <div>Анкета завершена!</div>;

    return (
      <Gapped vertical gap={20}>
        <div style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px' }}>{question.text}</div>
        {question.options.map(option => (
          <Button
            key={option.value}
            use="primary"
            onClick={() => handleAnswer(question.id, option.value, option)}
          >
            {option.value}
          </Button>
        ))}
        <Button use="default" onClick={goBack} disabled={history.length === 0}>Назад</Button>
        <h2>Рекомендации</h2>
        {recommendations.length > 0 ? (
          <ul>
            {recommendations.map(rec => (
              <li key={rec}>{questionnaireData.recommendations[rec]}</li>
            ))}
          </ul>
        ) : (
          <p>Рекомендаций пока нет</p>
        )}
      </Gapped>
    );
  };

  const renderManualMode = () => (
    <Gapped vertical gap={20}>
      {questionnaireData.questions.map(question => (
        <div key={question.id}>
          <h4>{question.text}</h4>
          <Select
            items={question.options.map(opt => [opt.value, opt.value])}
            value={answers[question.id] || ""}
            onValueChange={value => {
              const option = question.options.find(opt => opt.value === value);
              if (option) handleAnswer(question.id, value, option);
            }}
          />
        </div>
      ))}
      <h2>Рекомендации</h2>
      {recommendations.length > 0 ? (
        <ul>
          {recommendations.map(rec => (
            <li key={rec}>{questionnaireData.recommendations[rec]}</li>
          ))}
        </ul>
      ) : (
        <p>Рекомендаций пока нет</p>
      )}
    </Gapped>
  );

  return (
    <Gapped vertical gap={20}>
      <Gapped gap={10}>
        <Button use={mode === "linear" ? "primary" : "default"} onClick={() => setMode("linear")}>Линейный режим</Button>
        <Button use={mode === "manual" ? "primary" : "default"} onClick={() => setMode("manual")}>Ручной режим</Button>
      </Gapped>
      {mode === "linear" ? renderLinearMode() : renderManualMode()}
    </Gapped>
  );
};

export default Questionnaire;
