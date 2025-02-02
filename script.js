const emojiSets = [
    ['🍎', '🍉', '🍇', '🍒', '🥭', '🍍'],
    ['🐶', '🐱', '🐹', '🦊', '🐻', '🐼'],
    ['⚽', '🏀', '🏈', '⚾', '🎾', '🏉'],
    ['🌻', '🌼', '🌹', '🌺', '🌵', '🍀']
];

document.addEventListener("DOMContentLoaded", async function () {
    const gameContainer = document.querySelector('.game-container');
    const wrongAttemptsDisplay = document.getElementById('wrong-attempts');
    const newGameButton = document.getElementById('new-game');

    let currentEmojiSet = 0;
    let shuffledEmojis = [];
    let firstCard = null;
    let secondCard = null;
    let matchedPairs = 0;
    let wrongAttempts = 0;
    let exitCount = 0; // จำนวนครั้งที่ออกจากบ้านจาก API ของเพื่อน

    const API_BASE_URL = "http://localhost:3000"; 
    const DATASET_API_URL = `${API_BASE_URL}/playerDataset`;
    const FRIEND_API_URL =  'http://asiakrub.pythonanywhere.com/weekly_exit_count';;
    const SEND_TO_FRIEND_API = 'http://asiakrub.pythonanywhere.com/update_severity';;

    const USER_ID = localStorage.getItem("user_id") || prompt("กรอก User ID:", "test_user_12345");
    if (!USER_ID) {
        alert("❌ กรุณาใส่ User ID ก่อนเล่นเกม");
        throw new Error("User ID ไม่ถูกป้อน");
    }
    localStorage.setItem("user_id", USER_ID);
    console.log(`👤 User ID: ${USER_ID}`);

    await fetchAndAnalyzeExitData(USER_ID);
    startGame();

    function startGame() {
        firstCard = null;
        secondCard = null;
        matchedPairs = 0;
        wrongAttempts = 0;
        wrongAttemptsDisplay.textContent = wrongAttempts;

        shuffledEmojis = [...emojiSets[currentEmojiSet], ...emojiSets[currentEmojiSet]].sort(() => Math.random() - 0.5);
        gameContainer.innerHTML = '';

        shuffledEmojis.forEach((emoji) => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.dataset.emoji = emoji;
            card.innerHTML = emoji; // ✅ แสดงอิโมจิก่อนเริ่มเกม
            gameContainer.appendChild(card);
        });

        setTimeout(() => {
            document.querySelectorAll('.card').forEach((card) => {
                card.textContent = "❓";
                card.addEventListener('click', () => handleCardClick(card));
            });
        }, 2000); // ✅ ซ่อนอิโมจิหลัง 2 วินาที
    }

    function handleCardClick(card) {
        if (card.classList.contains('flipped') || card.classList.contains('matched') || (firstCard && secondCard)) return;

        card.classList.add('flipped');
        card.textContent = card.dataset.emoji;
        card.style.transform = "scale(1.1)";

        if (!firstCard) {
            firstCard = card;
        } else {
            secondCard = card;
            setTimeout(checkMatch, 500);
        }
    }

    function checkMatch() {
        if (firstCard.dataset.emoji === secondCard.dataset.emoji) {
            firstCard.classList.add('matched');
            secondCard.classList.add('matched');
            matchedPairs++;
            resetCards(true);

            if (matchedPairs === emojiSets[currentEmojiSet].length) {
                setTimeout(() => {
                    alert('🎉 คุณชนะแล้ว! กำลังบันทึกข้อมูล...');
                    endGame();
                    nextGame();
                }, 500);
            }
        } else {
            wrongAttempts++;
            wrongAttemptsDisplay.textContent = wrongAttempts;

            setTimeout(() => {
                firstCard.classList.remove('flipped');
                secondCard.classList.remove('flipped');
                firstCard.innerHTML = "❓";
                secondCard.innerHTML = "❓";
                firstCard.style.transform = "scale(1)";
                secondCard.style.transform = "scale(1)";
                resetCards();
            }, 600);
        }
    }

    function resetCards(matched = false) {
        if (!matched) {
            firstCard.innerHTML = "❓";
            secondCard.innerHTML = "❓";
        }
        firstCard = null;
        secondCard = null;
    }

    function nextGame() {
        matchedPairs = 0;
        wrongAttempts = 0;
        currentEmojiSet = (currentEmojiSet + 1) % emojiSets.length;
        setTimeout(startGame, 1000);
    }

    async function fetchAndAnalyzeExitData(userId) {
        try {
            const response = await fetch(`${FRIEND_API_URL}?user_id=${userId}`);
            if (!response.ok) throw new Error(`❌ ดึงข้อมูลจาก API ของเพื่อนล้มเหลว (${response.status})`);
    
            const friendData = await response.json();
            console.log("📥 ข้อมูลจาก API ของเพื่อน:", friendData);
    
            exitCount = friendData.count ? friendData.count : 0; // ถ้าไม่มีค่าให้ใช้ 0
        } catch (error) {
            console.error("❌ ดึงข้อมูลของเพื่อนล้มเหลว:", error);
            exitCount = 0;
        }
    }

    async function analyzeUserData(userId, wrongAttempts, count) {
        console.log("📊 กำลังเรียก analyzeUserData()", { userId, wrongAttempts, count }); // ✅ Debugging
    
        let severity = determineAlzheimersStage(wrongAttempts, count);
        console.log(`📊 วิเคราะห์: WrongAttempts = ${wrongAttempts}, Count = ${count}, ระดับอาการ = ${severity}`);
    
        await saveAnalysisToDB({
            user_id: userId,
            wrongAttempts,
            count,
            severity
        });
    }

    function determineAlzheimersStage(wrongAttempts, count) {
        let score = (wrongAttempts * 0.7) + (count / 10);  // ลดผลกระทบของ count
        
        console.log(`📊 คำนวณระดับอาการ:`);
        console.log(`🔹 Wrong Attempts: ${wrongAttempts}`);
        console.log(`🔹 Count (Exit Data): ${count}`);
        console.log(`🔹 Score: ${score}`);
    
        if (score < 1.5) return "None";
        if (score < 3) return "Moderate";
        return "Severe";
    }
    async function saveAnalysisToDB(analysisData) {
        console.log("📤 กำลังบันทึกผลวิเคราะห์ลง dataset ของฉัน:", analysisData);
    
        try {
            const response = await fetch(DATASET_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(analysisData)
            });
    
            const data = await response.json();
            console.log("✅ ข้อมูลถูกบันทึกใน dataset ของฉันสำเร็จ:", data);
    
            console.log("📡 เรียกฟังก์ชัน `sendAnalysisToFriend()` ..."); // ✅ Debugging
            await sendAnalysisToFriend(analysisData);
        } catch (error) {
            console.error("❌ ไม่สามารถบันทึกข้อมูลลง dataset ของฉัน:", error);
        }
    }

    async function sendAnalysisToFriend(analysisData) {
        console.log("📢 กำลังเรียก sendAnalysisToFriend()...", analysisData); // ✅ Debugging
        try {
            const response = await fetch(SEND_TO_FRIEND_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(analysisData)
            });
    
            const data = await response.json();
            console.log("✅ ส่งผลวิเคราะห์ไปให้เพื่อนสำเร็จ:", data);
        } catch (error) {
            console.error("❌ ไม่สามารถส่งผลวิเคราะห์ให้เพื่อนได้:", error);
        }
    }

    async function endGame() {
        console.log("🔴 เกมจบแล้ว! กำลังบันทึกข้อมูล...");
        await analyzeUserData(USER_ID, wrongAttempts, exitCount);
    }

    newGameButton.addEventListener('click', startGame);
});