// ==UserScript==
// @name         Vtuber-GPT-TTS
// @namespace    GPT-TTS
// @version      0.3
// @description  用于模拟主播直播用的文字转语音脚本
// @author       ollwhl
// @match        https://flowgpt.com/chat
// @match        https://chat.openai.com/*
// @grant        GM_xmlhttpRequest
// @require      https://cdn.bootcdn.net/ajax/libs/jquery/3.6.1/jquery.min.js
// @run-at       document-end
// @license      MIT
// ==/UserScript==
(function() {

    'use strict';
    var useGradioAPI=true;
    //是否使用Grdio的Api，如果不使用填写false
    //use gradioApi or not
    //GradioAPiを使うか、使わないならfalseをいれてください
    var localURL="http://127.0.0.1:5000";
    //填写你的本地TTS服务器地址
    //Enter your local TTS server address.
    //ローカルのTTSサーバーのアドレスを入力してください
    var gradioURL="https://xzjosh-carol-bert-vits2.hf.space/--replicas/x6tfx/";
    var gradioSpeaker="Carol"
    //填写Gradio服务器的地址，必须是在外部服务器部署的，如果是本地部署的Gradio没法读取文件，如果使用请先到Gradio的GUI上查看via API地址
    //Enter the address of the Gradio server. It must be deployed on an external server, as locally deployed Gradio cannot access files.Before using, please first check the 'via API' address on the Gradio GUI.
    //Gradioサーバーのアドレスを入力してください。外部サーバーにデプロイされている必要があり、ローカルにデプロイされたGradioはファイルにアクセスできません。使用する前に、GradioのGUIで'via API'のアドレスを確認してください。
    var inputQueue = [
        "台本：准备唱一首晴天",
        "song:晴天",
        "台本：简短地介绍今天直播的主题：讲故事",
        "台本：询问观众们是否喜欢听故事","wait",
        "台本：介绍第一个故事的背景和为什么选择这个故事",
        "台本：开始讲第一个故事，控制在5-10分钟内",
        "台本：故事结束后，询问观众对这个故事的看法或感想",
        "台本：邀请观众分享类似的故事或经历",
        "台本：根据观众反馈，分享自己对故事的解读或感想",
        "台本：介绍第二个故事的背景，可以是个人经历或者一个广为人知的故事",
        "台本：开始讲第二个故事，控制在5-10分钟内",
        "台本：故事结束后，询问观众有何感想或者是否有类似经历",
        "台本：分享一个与第二个故事相关的个人经验或观点",
        "台本：询问观众们有没有想听的故事类型或主题","wait",
        "台本：选择一个观众提出的故事主题或类型，进行即兴讲述",
        "台本：即兴故事结束后，询问观众对这个故事的反应",
        "台本：对即兴故事进行自己的解读，分享故事里可能的寓意或者深层含义",
        "台本：询问观众对今晚的故事主题直播有何建议或感想",
        "台本：感谢观众们的参与和建议，简单预告下次直播的主题或计划",
        "台本：向直播间的观众说再见，告知下次直播的时间"
    ];
    var useLive2D = false;
    var toggleButton = document.createElement("button");
    if (!useGradioAPI) {
        toggleButton.textContent = "using LocalAPI";
        toggleButton.title = "Click to switch to Gradio API";
    } else {
        toggleButton.textContent = "using GradioAPI";
        toggleButton.title = "Click to switch to Local API";
    }
    toggleButton.style.position = 'fixed';
    toggleButton.style.top = '200px';
    toggleButton.style.right = '10px';
    toggleButton.style.zIndex = '9999';
    toggleButton.addEventListener("click", function () {
        useGradioAPI = !useGradioAPI;
        if (!useGradioAPI) {
            toggleButton.textContent = "using LocalAPI";
            toggleButton.title = "Click to switch to Gradio API";
        } else {
            toggleButton.textContent = "using GradioAPI";
            toggleButton.title = "Click to switch to Local API";
        }
    });
    document.body.appendChild(toggleButton);

    var massageClass;
    var baseDomain = window.location.hostname;
    if (baseDomain === "chat.openai.com") {
        massageClass=".prose";
    } else if (baseDomain === "flowgpt.com") {
        massageClass="div.flowgpt-markdown.prose-invert.flex-1.whitespace-pre-wrap.markdown-body.overflow-auto";
    } else {
        console.log("This is some other domain!");
    }

    document.addEventListener("beforescriptexecute", function(event) {
        var oldCSP = document.querySelector("meta[http-equiv='Content-Security-Policy']");
        if (oldCSP) {
            oldCSP.remove();
        }

        // Add the new CSP
        var newCSP = document.createElement("meta");
        newCSP.httpEquiv = "Content-Security-Policy";
        newCSP.content = "default-src 'self' https://xzjosh-carol-bert-vits2.hf.space; media-src 'self' https://xzjosh-carol-bert-vits2.hf.space;";
        document.head.appendChild(newCSP);
    });


    let startButton = document.createElement('button');
    startButton.innerText = 'StartTTS';
    startButton.style.position = 'fixed';
    startButton.style.top = '100px';
    startButton.style.right = '10px';
    startButton.style.zIndex = '9999';
    startButton.addEventListener('click', startScript);
    document.body.appendChild(startButton);

    let stopButton = document.createElement('button');
    stopButton.innerText = 'StopTTS';
    stopButton.style.position = 'fixed';
    stopButton.style.top = '150px';
    stopButton.style.right = '10px';
    stopButton.style.zIndex = '9999';
    stopButton.addEventListener('click', stopListening(massageClass));
    document.body.appendChild(stopButton);

    console.log("TTS script activate");
    var isListeningDomChange =false;

    let inputButton = document.createElement('button');
    inputButton.innerText = 'start act';
    inputButton.style.position = 'fixed';
    inputButton.style.top = '250px';
    inputButton.style.right = '10px';
    inputButton.style.zIndex = '9999';
    function startScript() {
        if(!isListeningDomChange){
            alert('TTS has started!');
            getBGM()
             if (baseDomain === "flowgpt.com"){
            listenDOMChange('.chakra-text.css-1pw8fnh');
             }
            isListeningDomChange =true;
            startButton.innerText = 'TTS STARTED';
        }else{
            console.log("Speaker changed");
        }
        $(massageClass).addClass('processed');

        listenForNewElements('body',massageClass,checkText)
        inputButton.addEventListener('click', function() {
            startAct();
        });
        document.body.appendChild(inputButton);
        //listenKey(massageClass,checkText)
    }
    //setTimeout(function() {
    //    console.log("script activate 1");
    //    $('div.flowgpt-markdown.prose-invert.flex-1.whitespace-pre-wrap.markdown-body.overflow-auto').addClass('processed');
    //    listenKey('div.flowgpt-markdown.prose-invert.flex-1.whitespace-pre-wrap.markdown-body.overflow-auto',checkText);
    //}, 5000);
    const skip=0;
    var skipCount = skip;
    const requestQueue = [];
    var isRequestPending = false;
    var textChecked = false;
    var inputIndex = 0;
    var inputElement = '#prompt-textarea';
    console.log(inputElement);
    function inputText(inputElement){
       var element = $(inputElement);
        console.log("input element:",element);
        if (inputIndex < inputQueue.length) {
            var currentText = inputQueue[inputIndex];
            inputIndex++;
            if(currentText.includes("song:")){
                var songElement = ($("<div></div>"));
                songElement.text(currentText);
                console.log("songElement",songElement);
                console.log("song",songElement.text());
                requestQueue.push(songElement);
                console.log("push song request:",requestQueue.length);
                sendNextText();
                return
            }
            if(currentText.includes("wait")){
                alert("可以开始与主播互动了")
                isRunningAct=false;
                console.log('停止');
                inputButton.innertext='开始';
                clearInterval(intervalId);
                return
            }
            element.focus(); // 确保元素获取焦点
            let inputLabel = $(inputElement); //这里获取需要自动录入的input内容
            let lastValue = inputLabel[0].value;
            inputLabel[0].value = currentText;
            let event = new Event("input", { bubbles: true });
            //  React15
            event.simulated = true;
            //  React16 内部定义了descriptor拦截value，此处重置状态
            let tracker = inputLabel[0]._valueTracker;
            if (tracker) {
                tracker.setValue(lastValue);
            }
            inputLabel[0].dispatchEvent(event);
            var buttonToClick = $("button[data-testid='send-button']");
            buttonToClick.click();
            isTextFinish=false;
        } else {
            console.log("已经输入完所有文本");
            console.log('停止');
            inputButton.innertext='开始';
            clearInterval(intervalId);
            inputIndex=0;
        }
    }
    var isRunningAct=false;
    var intervalId;
    var isTextFinish = true;
    function startAct () {
        isRunningAct=!isRunningAct;
        if (isRunningAct) {
            console.log('开始');
            inputButton.innertext='停止';
            intervalId = setInterval(function () {
                if(isTextFinish){
                    inputText(inputElement);
                }
            }, 1000);
        } else {
            console.log('停止');
            inputButton.innertext='开始';
            clearInterval(intervalId);
        }
    }
    function checkText(element) {
        textChecked = true;
        if (!element.hasClass('processed')) {
            console.log(skipCount);
            if (skipCount > 0) {
                skipCount--;
            } else {
                skipCount = skip;
                var text = element.text();
                console.log(text);
                requestQueue.push(element)
                console.log("push text request:",requestQueue.length);
                sendNextText();
                element.addClass('processed');
            }
        }
    }
    function removeTextWithinBrackets(str) {
        return str.replace(/(\(.*?\)|（.*?）|\{.*?\})/g, '');;
    }
    function strToJson(str){
        if(str.includes("jsonCopy code")||str.includes("data")){
            str=str.trim();
            const jsonIndex = str.indexOf("{");
            var tmpStr = str.substring(jsonIndex);
            console.log(tmpStr)
            tmpStr=tmpStr.trim();
            try {
                var json=JSON.parse(tmpStr);
                console.log("json化成功：",json);
                return json;
            } catch (error) {
                console.log("json化失败：",tmpStr);
                return removeTextWithinBrackets(str);
            }
        }else{
            console.log("不是json类型");
            return removeTextWithinBrackets(str);
        }
    }
    var elementCompair;
    var audioQueue = [];
    var isPlaying = false;
    var route="text"
    function sendText(element) {
        if (isRequestPending) {
            console.log("等待上一个响应完成...");
            return;
        }
        isRequestPending = true;
        var json = strToJson(element.text());
        var text;
        if(useLive2D){
            useGradioAPI=false;
            text=json;
        }else{
            try{
                text=json.data[0]
            }catch{
                text=json;
            }
        }
        if(text===""||text===" "){
            isRequestPending = false;
            sendText(element);
        }
        if(element.text().includes("song:")){
          useGradioAPI=false;
          route="song"
        }else{
          route="text"
        }
        if(useGradioAPI){
            console.log("sending request to gradioServer：",text );
            sendTextToGrodio(element);
        }else{
            console.log("sending request to localServer：",text );
            GM_xmlhttpRequest({
                method: "GET",
                url: "http://127.0.0.1:5000/" + route + "?text=" + encodeURIComponent(text),
                responseType: 'arraybuffer',
                onload: function(response) {
                    if (response.status >= 200 && response.status < 400) {
                        console.log("成功：", response);
                        isRequestPending = false;
                        var clonedBuffer = response.response.slice(0);
                        if(elementCompair!=element){
                            var playButton = $('<button>').text('播放').click(function() {
                                //playAudioWithBlob(savedAudioDataMap[text]);
                                //var audioBuffer = $(this).data(clonedBuffer);
                                elementCompair=element;
                                var jThis = element;
                                console.log("index :",element.text(),"data: ",element)
                                sendText(element);
                            });
                            element.after(playButton);
                        }
                        audioQueue.push(clonedBuffer);
                        playNextAudio();
                        //playAudio(clonedBuffer);
                        //playAudioWithBlob(savedAudioDataMap[text]);
                    } else {
                        console.log("出错：", response.statusText);
                        var textElement = $("<p>请求出错，请按F12查看控制台信息</p>");
                        element.after(textElement);
                    }
                },
                onerror: function(error) {
                    console.log("请求失败：", error);
                    var textElement = $("<p>请求失败，请按F12查看控制台信息</p>");
                    element.after(textElement);
                }
            });
        }
        sendNextText()
    }
    function sendNextText(){
        var interval;
        interval = setInterval(function () {
            if(requestQueue.length===0){
                console.log("STOP SEND")
                clearInterval(interval)
            }
            if(!isRequestPending){
                console.log("shift request:",requestQueue.length);
                sendText(requestQueue.shift());
            }else{
                console.log("wait last request respons");
            }
        }, 100); // 1秒延迟，根据需要调整
    }
    async function sendTextToGrodio(element){
        const urlObj = new URL(gradioURL);
        const baseDomain = urlObj.origin;
        var text = removeTextWithinBrackets(element.text());
        GM_xmlhttpRequest({
            method: "POST",
            url: baseDomain+"/run/predict",
            headers: {
                "Content-Type": "application/json",
            },
            data: JSON.stringify({
                "fn_index": 0,
                "data": [
                    text,
                    gradioSpeaker,
                    0.5,
                    0.6,
                    0.6,
                    1.2
                ]
            }),
            onload: function(response) {
                console.log("成功：", response);
                var path;
                var filePath;
                if (response && response.responseText) {
                    try {
                        const parsedResponse = JSON.parse(response.responseText);
                        if (Array.isArray(parsedResponse.data) && parsedResponse.data.length > 1) {
                            path = parsedResponse.data[1].name;
                            filePath=gradioURL+'file='+path;
                            console.log("filePath:", filePath);
                        } else {
                            console.error("Unexpected parsed response:", parsedResponse);
                        }
                    } catch (e) {
                        console.error("Failed to parse JSON:", e);
                    }
                } else {
                    console.error("Invalid or empty response:", response);
                }
                const id = path.match(/gradio\/([a-f0-9]+)\/audio\.wav/);
                console.log("sending request to :", filePath);
                GM_xmlhttpRequest({
                    method: "GET",
                    url: filePath,
                    responseType: 'arraybuffer',
                    onload: function(response) {
                        if (response.status >= 200 && response.status < 400) {
                            console.log("成功：", response);
                            isRequestPending = false;
                            var clonedBuffer = response.response.slice(0);
                            if(elementCompair!=element){
                                var playButton = $('<button>').text('播放').click(function() {
                                    GM_xmlhttpRequest({
                                        method: "GET",
                                        url: filePath,
                                        responseType: 'arraybuffer',
                                        onload: function(response) {
                                            if (response.status >= 200 && response.status < 400) {
                                                console.log("成功：", response);
                                                var clonedBuffer = response.response.slice(0);
                                                audioQueue.push(clonedBuffer);
                                                playNextAudio();
                                                //playAudioWithBlob(savedAudioDataMap[text]);
                                            } else {
                                                console.log("出错：", response.statusText);
                                                var textElement = $("<p>请求出错，请按F12查看控制台信息</p>");
                                                element.after(textElement);
                                            }
                                        },
                                        onerror: function(error) {
                                            console.log("请求失败：", error);
                                            var textElement = $("<p>请求失败，请按F12查看控制台信息</p>");
                                            element.after(textElement);
                                        }
                                    });
                                });
                                element.after(playButton);
                            }
                            audioQueue.push(clonedBuffer);
                            playNextAudio();
                            //playAudioWithBlob(savedAudioDataMap[text]);
                        } else {
                            console.log("出错：", response.statusText);
                        }
                    },
                    onerror: function(error) {
                        console.log("请求失败：", error);
                        var textElement = $("<p>请求出错，请按F12查看控制台信息</p>");
                        targetElement.after(textElement);
                    }
                });
            },
            onerror: function(response) {
                console.log("Error: ", response);
            }
        })};
    function addPlayButton(element,text){
        var playButton = $('<button>').text('播放').click(function() {
            playAudio(savedAudioDataMap[text]);
        });
        element.after(playButton);
    }
    function playAudioWithBlob(audioData, mimeType = 'audio/wav') {
        const blob = new Blob([audioData], { type: mimeType });
        const audio = new Audio(URL.createObjectURL(blob));
        audio.play();
    }
    function playNextAudio() {
        if (audioQueue.length > 0 && !isPlaying) {
            isPlaying = true;
            var audioData = audioQueue.shift();

            var audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioContext.decodeAudioData(audioData, function (buffer) {
                var audioSource = audioContext.createBufferSource();
                audioSource.buffer = buffer;
                audioSource.connect(audioContext.destination);
                audioSource.start();
                audioSource.onended = function () {
                    isPlaying = false;
                    playNextAudio();
                };
            });
        }
    }
    function listenDOMChange(selectorTxt) {
        var targetNode = $(selectorTxt).get(0);

        var config = { childList: true, subtree: true, characterData: true };

        var callback = function(mutationsList) {
            for(var mutation of mutationsList) {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    //stopListening('div.flowgpt-markdown.prose-invert.flex-1.whitespace-pre-wrap.markdown-body.overflow-auto');
                    startScript();
                }
            }
        };

        var observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    };
    var isListening = false; // 添加一个标志来表示是否正在监听
    function listenKey(selectorTxt, actionFunction, bWaitOnce, iframeSelector) {
        // 如果正在监听，则直接返回，避免重复启动监听
        if (isListening) {
            return;
        }

        // 设置正在监听的标志
        isListening = true;

        var targetNodes, btargetsFound;

        if (typeof iframeSelector == "undefined")
            targetNodes = $(selectorTxt);
        else
            targetNodes = $(iframeSelector).contents()
                .find(selectorTxt);

        if (targetNodes && targetNodes.length > 0) {
            btargetsFound = true;
            targetNodes.each(function () {
                var jThis = $(this);
                var alreadyFound = jThis.data('alreadyFound') || false;

                if (!alreadyFound) {
                    // 添加识别的类，例如 'listened-element'
                    jThis.addClass('listened-element');

                    //--- Check if the DOM content is changing.
                    var initialContent = jThis.html();
                    var cancelFound = false;
                    var interval = setInterval(function () {
                        var currentContent = jThis.html();
                        if (initialContent !== currentContent) {
                            clearInterval(interval);
                            //--- Call the payload function.
                            cancelFound = actionFunction(jThis);
                            jThis.data('alreadyFound', true);
                            jThis.removeClass('listened-element'); // 移除识别的类
                            if (!cancelFound) {
                                listenKey(selectorTxt, actionFunction, bWaitOnce, iframeSelector);
                            }
                        }
                    }, 2000);
                }
            });
        } else {
            btargetsFound = false;
        }

        var controlObj = listenKey.controlObj || {};
        var controlKey = selectorTxt.replace(/[^\w]/g, "_");
        var timeControl = controlObj[controlKey];

        //--- Now set or clear the timer as appropriate.
        if (btargetsFound && bWaitOnce && timeControl) {
            clearInterval(timeControl);
            delete controlObj[controlKey];
        } else {
            if (!timeControl) {
                timeControl = setInterval(function () {
                    listenKey(selectorTxt, actionFunction, bWaitOnce, iframeSelector);
                }, 300);
                controlObj[controlKey] = timeControl;
            }
        }

        // 清除监听标志，以便在下次监听时可以重新启动
        isListening = false;
        listenKey.controlObj = controlObj;
    }
    function listenForNewElements(parentSelector, childSelector, actionFunction, iframeSelector) {
        var parentNodes;

        if (typeof iframeSelector == "undefined") {
            parentNodes = $(parentSelector);
        } else {
            parentNodes = $(iframeSelector).contents().find(parentSelector);
        }

        parentNodes.each(function() {
            var jThis = $(this);

            // 使用MutationObserver来监听DOM变化
            var observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList') {
                        $(mutation.addedNodes).each(function() {
                            var newNode = $(this);
                            if (newNode.is(childSelector)) {
                                waitForElementStability3(newNode, actionFunction);
                            }
                        });
                    }
                });
            });

            var config = { childList: true, subtree: true };
            observer.observe(jThis[0], config);
        });
    }
    function waitForElementStability1(element, actionFunction) {
        var lastContent = element.html();
        var stabilityTimer = null;
        var stabilityDelay = 1000; // 设定稳定性的时间，例如1秒

        var observer = new MutationObserver(function() {
            console.log($('.btn.relative.btn-neutral').text().includes("Stop generating"));
            if (element.html() !== lastContent&&!$('.btn.relative.btn-neutral').text().includes("Stop generating")) {
                lastContent = element.html();
                if (stabilityTimer) {
                    clearTimeout(stabilityTimer); // 如果内容变了，重置定时器
                }
                stabilityTimer = setTimeout(function() {
                    actionFunction(element);
                    observer.disconnect(); // 停止观察，因为元素已经稳定
                }, stabilityDelay);
            }
        });

        observer.observe(element[0], { childList: true, subtree: true });
    }
    function waitForElementStability3(element, actionFunction, checkInterval) {
        checkInterval = checkInterval || 1000;  // 默认每500ms检查一次
        var interval = setInterval(function() {
            console.log(element.length && !$('.btn.relative.btn-neutral').text().includes("Stop generating"),)
            if (element.length && !$('.btn.relative.btn-neutral').text().includes("Stop generating")) {
                isTextFinish=true;
                actionFunction(element);
                clearInterval(interval);
            }
        }, checkInterval);
    }
    function waitForElementStability2(element, actionFunction, waitTime) {
        var timer = null;
        waitTime = waitTime || 500; // 默认等待时间是500ms

        if (!element.length) {
            // 如果元素不存在，不进行后续操作
            return;
        }
        // 创建一个观察器实例并传入回调函数
        var observer = new MutationObserver(function(mutations) {
            // 如果有一个正在等待的定时器，清除它
            if (timer) {
                clearTimeout(timer);
            }

            // 设置新的定时器
            timer = setTimeout(function() {
                if (!$('.btn.relative.btn-neutral').text().includes("Stop generating")) {
                    console.log($('.btn.relative.btn-neutral').text());
                    actionFunction(element);
                    timer = null;
                }
            }, waitTime);
        });

        // 以配置对象参数开始观察目标节点
        observer.observe(element[0], { childList: true, subtree: true });
    }
    function stopListening(elementText){
        startButton.innerText = 'StartTTS'
        var myElement = $(elementText);
        var clonedElement = myElement.clone(true);
        myElement.replaceWith(clonedElement);
    }
    let audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let BGMSource = null;
    let startBGMTime = 0; // 开始播放BGM的时间点（相对于audioContext.currentTime）
    let pauseBGMTime = 0; // 暂停BGM时的时间点
    let BGMBuffer = null; // 用于存储解码后的BGM数据

    async function playBGM(audioData) {
        try {
            if (!BGMBuffer) {
                BGMBuffer = await audioContext.decodeAudioData(audioData);
            }

            if (BGMSource) {
                BGMSource.stop();
            }

            BGMSource = audioContext.createBufferSource();
            BGMSource.buffer = BGMBuffer;
            BGMSource.connect(audioContext.destination);

            if (pauseBGMTime) {
                let offset = pauseBGMTime - startBGMTime;
                BGMSource.start(0, offset);
            } else {
                BGMSource.start();
            }

            startBGMTime = audioContext.currentTime - (pauseBGMTime - startBGMTime);
            pauseBGMTime = 0;
        } catch (error) {
            console.error('Error decoding or playing BGM data:', error);
        }
    }

    function pauseBGM() {
        if (BGMSource) {
            BGMSource.stop();
            pauseBGMTime = audioContext.currentTime;
        }
    }

    function stopBGM() {
        if (BGMSource) {
            BGMSource.stop();
            pauseBGMTime = 0;
        }
    }
    // Your code here...
    let bgmData;
    function getBGM(){
        var dataUrl
        GM_xmlhttpRequest({
            method: "GET",
            // 音频文件的服务器URL
            url: "http://127.0.0.1:5000/bgm",
            responseType: 'arraybuffer',
            onload: function(response) {
                if (response.status >= 200 && response.status < 400) {
                    var bgmData = response.response;
                    playBGM(bgmData);
                }
            },
            onerror: function(error) {
                console.log("请求失败：", error);
            }
        });

        var bgm = document.createElement('div');

        // 创建播放按钮
        var playButton = document.createElement('button');
        playButton.textContent = '播放';
        playButton.addEventListener('click', function() {
            playBGM(bgmData)
        });

        // 创建暂停按钮
        var pauseButton = document.createElement('button');
        pauseButton.textContent = '暂停';
        pauseButton.addEventListener('click', function() {
            pauseBGM();
        });

        // 创建一个容器来放置音频元素和按钮
        var container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '20px'; // 调整按钮位置
        container.style.right = '20px'; // 调整按钮位置
        container.style.zIndex = '9999';

        // 将音频元素和按钮添加到容器
        container.appendChild(bgm);
        container.appendChild(playButton);
        container.appendChild(pauseButton);

        // 将容器添加到页面
        document.body.appendChild(container);
    }
})();
