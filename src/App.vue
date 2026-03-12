<template>
  <div class="relative w-full h-screen bg-bg overflow-hidden flex flex-col font-serif">
    <!-- Camera Background -->
    <div class="absolute inset-0 bg-black z-0">
      <video ref="videoRef" class="w-full h-full object-cover" autoplay playsinline muted></video>
    </div>

    <!-- Spiritual Vision Frame -->
    <div class="absolute inset-0 z-10 pointer-events-none flex items-center justify-center p-8">
      <div class="w-full max-w-sm aspect-[2/3] border-2 border-gold/50 rounded-2xl relative transition-all duration-300"
        :class="{ 'border-gold shadow-[0_0_30px_rgba(179,151,107,0.5)]': isLocked }">
        <!-- Corner Accents -->
        <div class="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-gold"></div>
        <div class="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-gold"></div>
        <div class="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-gold"></div>
        <div class="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-gold"></div>
      </div>
    </div>

    <!-- Loading State Overlay -->
    <div v-if="!isModelLoaded"
      class="absolute inset-0 z-50 bg-bg/90 flex flex-col items-center justify-center space-y-4">
      <div class="w-12 h-12 rounded-full border-4 border-gold/30 border-t-gold animate-spin"></div>
      <p class="text-gold tracking-widest text-lg animate-pulse">正在唤醒灵界视觉...</p>
    </div>
    <div v-else-if="authError"
      class="absolute inset-0 z-50 bg-bg/90 flex flex-col items-center justify-center p-6 text-center">
      <p class="text-red-500 mb-2">获取摄像头权限失败</p>
      <p class="text-sm text-text/70">请在浏览器设置中允许访问摄像头，并重新加载页面。</p>
    </div>

    <!-- Analysis Panel (Fixed at Bottom) -->
    <div
      class="absolute bottom-12 left-6 right-6 z-20 bg-bg/95 backdrop-blur-md rounded-3xl border-2 border-gold shadow-[0_10px_40px_rgba(179,151,107,0.3)] transition-all duration-300 p-8 flex flex-col justify-center items-center h-[140px]"
    >
      <!-- Scanning State (Unlocked) -->
      <div v-if="!isLocked" class="flex items-center justify-center space-x-4 w-full h-full">
        <div class="w-3 h-3 rounded-full bg-gold animate-ping"></div>
        <h2 class="text-gold text-xl tracking-widest font-bold">正在感应...</h2>
      </div>

      <!-- Locked State (Detailed Reading) -->
      <div v-else-if="currentCard" class="text-center animate-fade-in w-full h-full flex flex-col items-center justify-center">
        <h1 class="text-4xl text-gold font-bold mb-3">{{ currentCard.name_cn || currentCard.name }}</h1>
        <p class="text-[1.1rem] tracking-widest text-text/60 uppercase m-0">{{ currentCard.name_en || '' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, shallowRef } from 'vue';
import * as tf from '@tensorflow/tfjs';

// Configuration
const THRESHOLD = 0.8;
const FPS = 12;
const INTERVAL_MS = 1000 / FPS;

// Target References
const videoRef = ref(null);

// Reactive State
const isModelLoaded = ref(false);
const authError = ref(false);
const isLocked = ref(false);
const currentCard = ref(null);
const top5 = ref([]);

// Internal State
const currentFrameId = ref(null);
const lastProcessedTime = ref(0);
let myModel = null;
let tarotData = null;
let isPredicting = false;

const EXTRA_MEANINGS = {
  "78": {
    name_cn: "Extra_00",
    name_en: "Extra_00",
    interpretation: "阿尼亚",
    keywords: ["阿尼亚", "Demo", "英短银渐层"]
  },
  "79": {
    name_cn: "Extra_01",
    name_en: "Extra_01",
    interpretation: "",
    keywords: [""]
  },
  "80": {
    name_cn: "Extra_02",
    name_en: "Extra_02",
    interpretation: "",
    keywords: ["",]
  },
  "81": {
    name_cn: "Extra_03",
    name_en: "Extra_03",
    interpretation: "",
    keywords: ["",]
  },
  "82": {
    name_cn: "Extra_04",
    name_en: "Extra_04",
    interpretation: "灰总",
    keywords: ["灰总",]
  }
};

const initCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment', // Use back camera if available
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false,
    });
    if (videoRef.value) {
      videoRef.value.srcObject = stream;
      // Need to wait until video is fully playing before starting inference loop
      videoRef.value.onloadedmetadata = () => {
        videoRef.value.play();
        startInferenceLoop();
      };
    }
  } catch (err) {
    console.error("Camera access failed", err);
    authError.value = true;
  }
};

const getCardMeaning = (index) => {
  const indexStr = index.toString();
  if (index >= 78 && EXTRA_MEANINGS[indexStr]) {
    return EXTRA_MEANINGS[indexStr];
  }
  if (tarotData && tarotData[indexStr]) {
    const d = tarotData[indexStr];
    return {
      name_cn: d.name_cn,
      name_en: d.name_en,
      keywords: d.upright_keywords ? d.upright_keywords.split(/[,，]\s*/) : [],
      interpretation: d.upright_interpretation,
      name: d.name_cn || `Card ${index}`
    };
  }
  return { name: `Unknown Card (${index})`, interpretation: '无法解读此卡片。' };
};

const getCardNameOnly = (index) => {
  const indexStr = index.toString();
  if (index >= 78 && EXTRA_MEANINGS[indexStr]) {
    return EXTRA_MEANINGS[indexStr].name_cn;
  }
  if (tarotData && tarotData[indexStr]) {
    return tarotData[indexStr].name_cn || tarotData[indexStr].name_en || `Card ${indexStr}`;
  }
  return `Card ${indexStr}`;
};

const processFrame = async () => {
  if (!myModel || !videoRef.value || videoRef.value.readyState < 2 || isPredicting) {
    return;
  }

  const now = performance.now();
  if (now - lastProcessedTime.value < INTERVAL_MS) {
    return;
  }

  isPredicting = true;
  lastProcessedTime.value = now;

  try {
    tf.engine().startScope();

    // 假设模型需要 224x224 RGB 归一化输入 [1, 224, 224, 3]
    // 实际需要根据你的 web_model 做调整。一般 GraphModel 支持浮点 0-1 或 -1 到 1
    const imgTensor = tf.browser.fromPixels(videoRef.value)
      .resizeBilinear([224, 224])
      .expandDims(0)
      .toFloat()
      .div(tf.scalar(255.0)); // Normalize to [0, 1]. Change if model needs [-1, 1]

    const predictions = await myModel.predict(imgTensor);

    // Flatten and get probabilities
    const scores = await predictions.data();

    let stats = [];
    for (let i = 0; i < scores.length; i++) {
      stats.push({ index: i, score: scores[i], name: getCardNameOnly(i) });
    }
    stats.sort((a, b) => b.score - a.score);

    const topStats = stats.slice(0, 5);
    top5.value = topStats;

    const top1 = topStats[0];

    if (top1.score >= THRESHOLD) {
      if (!isLocked.value || (currentCard.value && getCardNameOnly(top1.index) !== currentCard.value.name_cn)) {
        currentCard.value = getCardMeaning(top1.index);
        isLocked.value = true;
      }
    } else {
      isLocked.value = false;
      currentCard.value = null;
    }

  } catch (err) {
    console.warn("Prediction error:", err);
  } finally {
    tf.engine().endScope(); // Guarantee disposal of tensors created in this scope
    isPredicting = false;
  }
};

const startInferenceLoop = () => {
  const loop = () => {
    processFrame();
    currentFrameId.value = requestAnimationFrame(loop);
  };
  loop();
};

onMounted(async () => {
  try {
    // Parallel Model & Data Fetching
    const [model, response] = await Promise.all([
      tf.loadGraphModel('/model/model.json'),
      fetch('/data/tarot_meanings_modern_fixed.json').then(res => res.json())
    ]);

    myModel = model;
    tarotData = response;
    isModelLoaded.value = true;

    // Start Camera
    await initCamera();

  } catch (err) {
    console.error("Failed to load resources:", err);
    // Silent fail or show user error logic
  }
});

onUnmounted(() => {
  if (currentFrameId.value) {
    cancelAnimationFrame(currentFrameId.value);
  }
  if (videoRef.value && videoRef.value.srcObject) {
    videoRef.value.srcObject.getTracks().forEach(t => t.stop());
  }
  if (myModel) {
    myModel.dispose();
  }
});
</script>

<style>
/* Custom utility for hiding scrollbars but allowing scroll */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.4s ease-out forwards;
}
</style>
