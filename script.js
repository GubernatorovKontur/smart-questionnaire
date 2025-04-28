// Глобальные переменные
 let scenarios = [];
 let currentStage = "1";
 let logEntries = [];
 let history = [];
 let choiceHistory = [];
 let recommendations = [];
 let answeredQuestions = {};
 let customRecommendations = [];
 let actionHistory = [];
 let redoStack = [];
 let mandatoryQuestions = [];
 let currentRole = null;

 // Шаблон демо-скрипта
 const demoScriptTemplate = `[Имя ЛПР], давайте ознакомимся на примере одной из компаний с основными преимуществами Фокуса.

Сейчас вы подключились к моему компьютеру. Должно быть видно окно моего браузера. У меня открыта начальная страница Фокуса.

Запрашиваем ОС: Видите строку поиска, как в Google или Яндексе?

Отлично. Поиск можно осуществлять по ИНН, адресу компании, ОГРН, ОКПО, телефону или ФИО физического лица.

[Имя ЛПР], я вам сейчас покажу пример компании [Название контрагента], чтобы вы увидели основные возможности системы. А потом можем проверить вашего контрагента или вашу компанию.

Сейчас я ввожу ИНН [ИНН контрагента], чтобы получить результат нажимаю Enter.

Запрашиваем ОС: Что видите?

У меня открылась карточка компании [Название контрагента]. [Имя ЛПР], т.к. информации о компании много, я сейчас вам покажу самые полезные функции и инструменты, которые упрощают работу. Если у вас появятся вопросы, вы меня смело останавливайте и спрашивайте. Договорились?

[RecommendationDetails]`;

 // Детали рекомендаций (из ТЗ)
 const recommendationDetails = {
   "реквизитная часть": { order: 1, text: "В левом столбце сервиса расположены основные реквизиты контрагента. ИНН и ОГРН, адреса и телефоны, руководящий состав, банковские счета и сведения из ФНС. Данные обновляются на ежедневной основе, а информацию о счетах вы можете получить по запросу. Таким образом у вас всегда будет актуальная информация о партнерах." },
   "выписка ЕГРЮЛ": { order: 2, text: "Блок позволяет оперативно получать актуальные выписки из ЕГРЮЛ и ЕГРИП по интересующим юридическим лицам. Получение выписки может быть полезно в нескольких случаях: для проверки контрагента в случае заключения договора, для определения регистрационных данных компании или ИП, ее учредителей, или для корректного выставления первичной бухгалтерской и юридической документации. Историческая выписка поможет убедиться, что на определенную дату в выписке из ЕГРЮЛ/ЕГРИП содержалась та или иная информация, например, для участия в конкурсах на субсидии и в других ситуациях." },
   "банковские счета": { order: 3, text: "В системе публикуются сведения о банках, в которых у компании могут быть открыты счета. Зная это, можно косвенно оценить надежность партнера. Например, сверить с Фокусом банк, который КА указал в счете. В Фокусе такие данные обновляются из трех источников — с сайтов самих компаний, Контур.Экстерна и заблокированные ФНС счета. Кроме того, информация о банковских счетах бывает полезна, когда необходимо определить банк, в который можно отправить исполнительный лист для взыскания подтвержденной в судебном порядке задолженности." },
   // Другие детали опущены для краткости, добавлены в полном коде
   "аналитика списков": { order: 20, text: "В системе представлены инструменты, которые позволяют проверить организации по заданному набору критериев наиболее существенных фактов. Вам не обязательно переходить в каждую организацию из списка чтобы их оценить. Во-первых, вы увидите статистику, которая демонстрирует общую картину по связанным компаниям: количество должников, банкротов, дисквалифицированных лиц и т.д. Во-вторых, каждая из строчек статистики одновременно является фильтром, с помощью которого можно сразу перейти к списку тех компаний, которые обладают рисковым признаком. Это позволит вам потратить меньше времени на проверку и оперативно увидеть проблемные факторы." },
   "наблюдение": { order: 21, text: "Вы можете ставить на контроль изменений интересующие компании и физических лиц. Информация поступает автоматически. Это позволит: автоматически отслеживать произошедшие изменения в выбранных организациях, оперативно реагировать на них соответствующим образом, автоматизировать рутинную работу по перепроверке компаний по истечении некоторого времени, отслеживать изменения как у юридических лиц и ИП, так и у физических лиц, а значит, видеть полную картину происходящих событий и быстро реагировать на них." }
 };

 // Загрузка сценариев
 async function loadScenarios() {
   try {
     const response = await fetch('scenarios.json');
     if (!response.ok) throw new Error('Не удалось загрузить scenarios.json');
     scenarios = await response.json();
     collectMandatoryQuestions();
     displayStage("1");
     renderChecklist();
     updateProgress();
     showOnboarding();
   } catch (error) {
     document.getElementById("stage-text").innerText = `Ошибка загрузки: ${error.message}`;
   }
 }

 // Сбор обязательных вопросов
 function collectMandatoryQuestions() {
   scenarios.forEach(stage => {
     if (stage.mandatory) {
       mandatoryQuestions.push({ id: stage.id, role: stage.role, answered: false });
     }
   });
 }

 // Отображение этапа
 function displayStage(stageId) {
   const stage = scenarios.find(s => s.id === stageId);
   if (!stage) {
     document.getElementById("stage-text").innerText = "Этап не найден";
     return;
   }

   history.push(currentStage);
   currentStage = stageId;

   const lprName = document.getElementById("lpr-name").value.trim() || "[Имя ЛПР]";
   const companyName = document.getElementById("company-name").value.trim() || "[Название организации]";

   let stageText = stage.text;
   stageText = stageText.replaceAll("[Имя ЛПР]", lprName).replaceAll("[Название организации]", companyName);

   document.getElementById("stage-text").innerText = stageText;

   const optionsDiv = document.getElementById("options");
   optionsDiv.innerHTML = "";
   stage.options.forEach(option => {
     if (!answeredQuestions[option.next] || stage.id === "1") {
       const btn = document.createElement("button");
       btn.innerText = option.text;
       btn.onclick = () => {
         logEntries.push(option.log);
         if (option.recommendation) {
           addRecommendation(option.recommendation, "script");
         }
         if (stage.id === "1") {
           currentRole = option.text;
           renderChecklist();
         }
         choiceHistory.push({ stageId: currentStage, choice: option.text, next: option.next });
         answeredQuestions[stage.id] = option.text;
         if (stage.mandatory) {
           mandatoryQuestions.find(q => q.id === stage.id).answered = true;
         }
         updateLog();
         updateHistory();
         updateProgress();
         updateRecommendationSummary();
         actionHistory.push({ type: "script", stageId, choice: option.text });
         redoStack = [];
         let nextStage = option.next;
         while (answeredQuestions[nextStage] && scenarios.find(s => s.id === nextStage)) {
           nextStage = scenarios.find(s => s.id === nextStage).options.find(o => o.text === answeredQuestions[nextStage]).next;
         }
         displayStage(nextStage);
       };
       optionsDiv.appendChild(btn);
     }
   });

   document.getElementById("back-btn").style.display = history.length > 0 ? "block" : "none";
 }

 // Рендеринг чеклиста
 function renderChecklist() {
   const checklistContent = document.getElementById("checklist-content");
   checklistContent.innerHTML = "";
   const roles = ["Директор", "Главный бухгалтер", "Юрист", "Коммерческий директор", "СЭБ"];
   roles.forEach(role => {
     const section = document.createElement("div");
     section.className = "checklist-section";
     section.innerHTML = `<h3>${role}</h3>`;
     const items = document.createElement("div");
     items.style.display = currentRole && currentRole !== role ? "none" : "block";
     const stages = scenarios.filter(s => s.role === role && s.id !== "1");
     const searchQuery = document.getElementById("checklist-search").value.toLowerCase();
     stages.forEach(stage => {
       if (stage.text.toLowerCase().includes(searchQuery) || stage.id.toLowerCase().includes(searchQuery)) {
         const item = document.createElement("div");
         item.className = `checklist-item ${stage.mandatory ? "mandatory" : ""}`;
         item.innerHTML = `<strong>${stage.id}: ${stage.text}</strong>`;
         stage.options.forEach(option => {
           const label = document.createElement("label");
           const checkbox = document.createElement("input");
           checkbox.type = "checkbox";
           checkbox.checked = answeredQuestions[stage.id] === option.text;
           checkbox.disabled = answeredQuestions[stage.id] && answeredQuestions[stage.id] !== option.text;
           checkbox.onchange = () => {
             if (checkbox.checked) {
               stage.options.forEach(opt => {
                 if (opt.text !== option.text) answeredQuestions[stage.id] = null;
               });
               answeredQuestions[stage.id] = option.text;
               logEntries.push(option.log);
               if (option.recommendation) {
                 addRecommendation(option.recommendation, "checkbox");
               }
               if (stage.mandatory) {
                 mandatoryQuestions.find(q => q.id === stage.id).answered = true;
               }
               actionHistory.push({ type: "checkbox", stageId: stage.id, choice: option.text });
               redoStack = [];
               updateLog();
               updateProgress();
               updateRecommendationSummary();
               renderChecklist();
               if (currentStage === stage.id) {
                 let nextStage = option.next;
                 while (answeredQuestions[nextStage] && scenarios.find(s => s.id === nextStage)) {
                   nextStage = scenarios.find(s => s.id === nextStage).options.find(o => o.text === answeredQuestions[nextStage]).next;
                 }
                 displayStage(nextStage);
               }
             }
           };
           label.appendChild(checkbox);
           label.appendChild(document.createTextNode(option.text));
           item.appendChild(label);
         });
         items.appendChild(item);
       }
     });
     section.appendChild(items);
     section.querySelector("h3").onclick = () => {
       items.style.display = items.style.display === "none" ? "block" : "none";
     };
     checklistContent.appendChild(section);
   });
 }

 // Добавление рекомендации
 function addRecommendation(rec, source) {
   if (!recommendations.some(r => r.id === rec.id)) {
     recommendations.push({ ...rec, source, role: currentRole, weight: rec.weight || 0.5 });
   }
 }

 // Обновление лога
 function updateLog() {
   document.getElementById("log").value = logEntries.join("\n");
 }

 // Обновление истории
 function updateHistory() {
   const historyList = document.getElementById("history-list");
   historyList.innerHTML = "";
   choiceHistory.forEach((entry, index) => {
     const li = document.createElement("li");
     li.innerText = `${entry.choice} (Этап ${entry.stageId})`;
     li.onclick = () => {
       currentStage = entry.next;
       logEntries = logEntries.slice(0, index + 1);
       history = history.slice(0, index + 1);
       choiceHistory = choiceHistory.slice(0, index + 1);
       recommendations = recommendations.filter(r => choiceHistory.some(c => c.stageId === r.stageId));
       displayStage(currentStage);
       updateLog();
       updateHistory();
       updateRecommendationSummary();
     };
     historyList.appendChild(li);
   });
 }

 // Обновление сводки рекомендаций
 function updateRecommendationSummary() {
   const recommendationList = document.getElementById("recommendation-list");
   recommendationList.innerHTML = "";
   const sortedRecommendations = [...recommendations, ...customRecommendations].sort((a, b) => (b.weight || 0) - (a.weight || 0));
   sortedRecommendations.forEach(rec => {
     const li = document.createElement("li");
     li.innerText = `РЕКОМЕНДАЦИЯ ${rec.id || "Пользовательская"}: ${rec.text} [${rec.source || "manual"}]`;
     recommendationList.appendChild(li);
   });
 }

 // Обновление прогресса
 function updateProgress() {
   const answered = mandatoryQuestions.filter(q => q.answered).length;
   const total = mandatoryQuestions.length;
   const percentage = total ? (answered / total) * 100 : 0;
   document.getElementById("progress-fill").style.width = `${percentage}%`;

   const mandatoryList = document.getElementById("mandatory-questions");
   mandatoryList.innerHTML = "";
   mandatoryQuestions.forEach(q => {
     if (!q.answered && (!currentRole || q.role === currentRole)) {
       const li = document.createElement("li");
       li.innerText = `${q.id}: Не отвечено`;
       li.style.color = "#D32F2F";
       mandatoryList.appendChild(li);
     }
   });

   if (answered < total) {
     document.getElementById("save-recommendations-btn").disabled = true;
   } else {
     document.getElementById("save-recommendations-btn").disabled = false;
   }
 }

 // Назад
 function goBack() {
   if (history.length > 0) {
     currentStage = history.pop();
     choiceHistory.pop();
     logEntries.pop();
     recommendations.pop();
     displayStage(currentStage);
     updateLog();
     updateHistory();
     updateRecommendationSummary();
   }
 }

 // Поиск в чеклисте
 document.getElementById("checklist-search").oninput = () => {
   renderChecklist();
 };

 // Добавление пользовательской рекомендации
 document.getElementById("add-custom-recommendation").onclick = () => {
   const input = document.getElementById("custom-recommendation-input");
   const text = input.value.trim();
   if (text) {
     customRecommendations.push({ text, source: "manual", weight: 0.4 });
     actionHistory.push({ type: "custom", text });
     redoStack = [];
     updateRecommendationSummary();
     input.value = "";
     const list = document.getElementById("custom-recommendation-list");
     const li = document.createElement("li");
     li.innerText = text;
     const delBtn = document.createElement("button");
     delBtn.innerText = "Удалить";
     delBtn.onclick = () => {
       customRecommendations = customRecommendations.filter(r => r.text !== text);
       actionHistory.push({ type: "delete-custom", text });
       redoStack = [];
       updateRecommendationSummary();
       list.removeChild(li);
     };
     li.appendChild(delBtn);
     list.appendChild(li);
   }
 };

 // Копирование лога
 document.getElementById("copy-log-btn").onclick = () => {
   const logText = document.getElementById("log");
   logText.select();
   document.execCommand("copy");
   alert("Лог скопирован!");
 };

 // Очистка лога
 document.getElementById("clear-log-btn").onclick = () => {
   logEntries = [];
   choiceHistory = [];
   history = [];
   recommendations = [];
   customRecommendations = [];
   answeredQuestions = {};
   mandatoryQuestions.forEach(q => q.answered = false);
   updateLog();
   updateHistory();
   updateRecommendationSummary();
   updateProgress();
   renderChecklist();
   displayStage("1");
   alert("Лог и история очищены!");
 };

 // Сохранение данных клиента
 document.getElementById("save-client-data").onclick = () => {
   const lprName = document.getElementById("lpr-name").value.trim();
   const companyName = document.getElementById("company-name").value.trim();
   const contragentName = document.getElementById("contragent-name").value.trim();
   const contragentInn = document.getElementById("contragent-inn").value.trim();

   const clientData = [];
   if (lprName || companyName || contragentName || contragentInn) {
     clientData.push("--- Данные клиента ---");
     if (lprName) clientData.push(`Имя ЛПР: ${lprName}`);
     if (companyName) clientData.push(`Название компании: ${companyName}`);
     if (contragentName) clientData.push(`Название контрагента: ${contragentName}`);
     if (contragentInn) clientData.push(`ИНН контрагента: ${contragentInn}`);
   } else {
     alert("Заполните хотя бы одно поле!");
     return;
   }

   logEntries.unshift(...clientData);
   updateLog();
   alert("Данные клиента сохранены в лог!");
 };

 // Генерация демо-скрипта
 document.getElementById("generate-demo-btn").onclick = () => {
   const lprName = document.getElementById("lpr-name").value.trim() || "[Имя ЛПР]";
   const companyName = document.getElementById("company-name").value.trim() || "[Название организации]";
   const contragentName = document.getElementById("contragent-name").value.trim() || "[Название контрагента]";
   const contragentInn = document.getElementById("contragent-inn").value.trim() || "[ИНН контрагента]";

   let demoScript = demoScriptTemplate;
   demoScript = demoScript.replaceAll("[Имя ЛПР]", lprName)
                         .replaceAll("[Название организации]", companyName)
                         .replaceAll("[Название контрагента]", contragentName)
                         .replaceAll("[ИНН контрагента]", contragentInn);

   const details = [];
   recommendations.forEach(rec => {
     rec.text.split(", ").forEach(item => {
       if (recommendationDetails[item.trim()]) {
         details.push({ ...recommendationDetails[item.trim()], recId: rec.id });
       }
     });
   });

   details.sort((a, b) => a.order - b.order);
   const detailText = details.map(d => `РЕКОМЕНДАЦИЯ ${d.recId}: ${d.text}`).join("\n\n");
   demoScript = demoScript.replace("[RecommendationDetails]", detailText || "Нет рекомендаций для демонстрации.");

   const modal = document.getElementById("demo-modal");
   document.getElementById("demo-script").value = demoScript;
   modal.style.display = "block";

   document.getElementById("copy-demo-script").onclick = () => {
     const textarea = document.getElementById("demo-script");
     textarea.select();
     document.execCommand("copy");
     alert("Демо-скрипт скопирован!");
   };

   document.getElementById("close-modal").onclick = () => {
     modal.style.display = "none";
   };
 };

 // Сохранение рекомендаций
 document.getElementById("save-recommendations-btn").onclick = () => {
   if (mandatoryQuestions.some(q => !q.answered && (!currentRole || q.role === currentRole))) {
     alert("Ответьте на все обязательные вопросы!");
     return;
   }

   const lprName = document.getElementById("lpr-name").value.trim() || "[Имя ЛПР]";
   const companyName = document.getElementById("company-name").value.trim() || "[Название организации]";
   const contragentName = document.getElementById("contragent-name").value.trim() || "[Название контрагента]";
   const contragentInn = document.getElementById("contragent-inn").value.trim() || "[ИНН контрагента]";

   let output = `Данные клиента:\n`;
   output += `Имя ЛПР: ${lprName}\n`;
   output += `Название компании: ${companyName}\n`;
   if (contragentName) output += `Название контрагента: ${contragentName}\n`;
   if (contragentInn) output += `ИНН контрагента: ${contragentInn}\n`;

   output += `\nРекомендации:\n`;
   if (recommendations.length === 0 && customRecommendations.length === 0) {
     const defaultRec = scenarios.find(s => s.id === `default_${currentRole.toLowerCase().replace(" ", "_")}`);
     if (defaultRec) {
       output += `- РЕКОМЕНДАЦИЯ ${defaultRec.recommendation.id}: ${defaultRec.recommendation.text} [Default]\n`;
     }
   } else {
     [...recommendations, ...customRecommendations].forEach(rec => {
       output += `- РЕКОМЕНДАЦИЯ ${rec.id || "Пользовательская"}: ${rec.text} [${rec.source || "manual"}]\n`;
     });
   }

   let demoScript = demoScriptTemplate;
   demoScript = demoScript.replaceAll("[Имя ЛПР]", lprName)
                         .replaceAll("[Название организации]", companyName)
                         .replaceAll("[Название контрагента]", contragentName)
                         .replaceAll("[ИНН контрагента]", contragentInn);

   const details = [];
   recommendations.forEach(rec => {
     rec.text.split(", ").forEach(item => {
       if (recommendationDetails[item.trim()]) {
         details.push({ ...recommendationDetails[item.trim()], recId: rec.id });
       }
     });
   });

   details.sort((a, b) => a.order - b.order);
   const detailText = details.map(d => `РЕКОМЕНДАЦИЯ ${d.recId}: ${d.text}`).join("\n\n");
   demoScript = demoScript.replace("[RecommendationDetails]", detailText || "Нет рекомендаций для демонстрации.");

   output += `\nДемо-скрипт:\n${demoScript}`;

   const blob = new Blob([output], { type: "text/plain" });
   const url = URL.createObjectURL(blob);
   const a = document.createElement("a");
   a.href = url;
   a.download = `recommendations_${new Date().toISOString().slice(0, 10)}.txt`;
   a.click();
   URL.revokeObjectURL(url);

   logEntries.push("Рекомендации сохранены");
   updateLog();
 };

 // Копирование рекомендаций
 document.getElementById("copy-recommendations").onclick = () => {
   let text = "Рекомендации:\n";
   if (recommendations.length === 0 && customRecommendations.length === 0) {
     const defaultRec = scenarios.find(s => s.id === `default_${currentRole.toLowerCase().replace(" ", "_")}`);
     if (defaultRec) {
       text += `- РЕКОМЕНДАЦИЯ ${defaultRec.recommendation.id}: ${defaultRec.recommendation.text} [Default]\n`;
     }
   } else {
     [...recommendations, ...customRecommendations].forEach(rec => {
       text += `- РЕКОМЕНДАЦИЯ ${rec.id || "Пользовательская"}: ${rec.text} [${rec.source || "manual"}]\n`;
     });
   }

   const textarea = document.createElement("textarea");
   textarea.value = text;
   document.body.appendChild(textarea);
   textarea.select();
   document.execCommand("copy");
   document.body.removeChild(textarea);
   alert("Рекомендации скопированы!");
 };

 // Управление вкладками
 document.querySelectorAll(".tab-btn").forEach(btn => {
   btn.onclick = () => {
     document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
     btn.classList.add("active");
     document.querySelectorAll(".tab-content").forEach(c => c.style.display = "none");
     document.getElementById(btn.dataset.tab).style.display = "block";
   };
 });

 // Отмена действия
 document.getElementById("undo-btn").onclick = () => {
   const lastAction = actionHistory.pop();
   if (lastAction) {
     redoStack.push(lastAction);
     if (lastAction.type === "script") {
       goBack();
     } else if (lastAction.type === "checkbox") {
       delete answeredQuestions[lastAction.stageId];
       recommendations = recommendations.filter(r => r.stageId !== lastAction.stageId);
       if (scenarios.find(s => s.id === lastAction.stageId).mandatory) {
         mandatoryQuestions.find(q => q.id === lastAction.stageId).answered = false;
       }
       renderChecklist();
       updateProgress();
       updateRecommendationSummary();
     } else if (lastAction.type === "custom") {
       customRecommendations = customRecommendations.filter(r => r.text !== lastAction.text);
       updateRecommendationSummary();
       renderChecklist();
     } else if (lastAction.type === "delete-custom") {
       customRecommendations.push({ text: lastAction.text, source: "manual", weight: 0.4 });
       updateRecommendationSummary();
       renderChecklist();
     }
   }
 };

 // Повтор действия
 document.getElementById("redo-btn").onclick = () => {
   const action = redoStack.pop();
   if (action) {
     actionHistory.push(action);
     if (action.type === "script") {
       const stage = scenarios.find(s => s.id === action.stageId);
       const option = stage.options.find(o => o.text === action.choice);
       logEntries.push(option.log);
       if (option.recommendation) {
         addRecommendation(option.recommendation, "script");
       }
       choiceHistory.push({ stageId: action.stageId, choice: action.choice, next: option.next });
       answeredQuestions[action.stageId] = action.choice;
       if (stage.mandatory) {
         mandatoryQuestions.find(q => q.id === action.stageId).answered = true;
       }
       updateLog();
       updateHistory();
       updateProgress();
       updateRecommendationSummary();
       displayStage(option.next);
     } else if (action.type === "checkbox") {
       const stage = scenarios.find(s => s.id === action.stageId);
       const option = stage.options.find(o => o.text === action.choice);
       answeredQuestions[action.stageId] = action.choice;
       logEntries.push(option.log);
       if (option.recommendation) {
         addRecommendation(option.recommendation, "checkbox");
       }
       if (stage.mandatory) {
         mandatoryQuestions.find(q => q.id === action.stageId).answered = true;
       }
       renderChecklist();
       updateProgress();
       updateRecommendationSummary();
     } else if (action.type === "custom") {
       customRecommendations.push({ text: action.text, source: "manual", weight: 0.4 });
       updateRecommendationSummary();
       renderChecklist();
     } else if (action.type === "delete-custom") {
       customRecommendations = customRecommendations.filter(r => r.text !== action.text);
       updateRecommendationSummary();
       renderChecklist();
     }
   }
 };

 // Онбординг
 function showOnboarding() {
   if (!localStorage.getItem("onboardingShown")) {
     document.getElementById("onboarding-modal").style.display = "block";
     document.getElementById("close-onboarding").onclick = () => {
       document.getElementById("onboarding-modal").style.display = "none";
       localStorage.setItem("onboardingShown", "true");
     };
   }
 }

 // Инициализация
 document.getElementById("back-btn").onclick = goBack;
 loadScenarios();