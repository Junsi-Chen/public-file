<!-- 聊天界面 -->
<template>
  <view class="chat">
    <!-- 导航 -->
    <ai-nav title="" :scrollTop="scrollTop" @getNavHeight="getNavHeight">
      <template #lf-content>
        <view class="lf-content flex">
          <view @click="handleCreate">
            <wd-icon
              class-prefix="pet"
              name="addTopic"
              size="24px"
              color="#333"
            />
          </view>
        </view>
      </template>
    </ai-nav>
    <!-- for循环渲染聊天记录列表 -->
    <scroll-view
      class="message-list"
      id="messageScroll"
      scroll-with-animation
      enable-back-to-top
      scroll-y
      :scroll-top="scrollTop"
      :style="{ height: `calc(100vh - ${navHeight}px - 100px)` }"
      @scroll="handleScroll"
    >
      <view style="padding-right: 24rpx">
        <view v-for="(item, index) in messageList" :key="index">
          <aiChatItem :item="item" />
        </view>
      </view>
    </scroll-view>

    <!-- 输入框 -->
    <inputField
      ref="inputFieldRef"
      :userInput="assistantQuestion.message"
      @handleSend="handleInputSend"
    />
  </view>
</template>

<script setup lang="ts">
import {
  createTalk,
  sendQuestion,
  getStream,
  getHistoryDetail,
} from "@/chat/api/api";
// 导航
import aiNav from "@/chat/components/ai-nav/ai-nav.vue";
// 输入组件
import inputField from "@/components/tools/inputField/inputField.vue";
// 聊天item
import aiChatItem from "@/chat/components/ai-chat-item/ai-chat-item.vue";
const aiAvatar = ref<string>("https://image.petaipal.com/image/litter-xl.png");
// 默认是助手进来
const type = ref<string>("");
// 输入框ref
const inputFieldRef = ref(null);
// 用户
const userInfoStore = useUserInfoStore();
// 消息数组 -> 默认第一条
const messageList = ref<Array<any>>([
  {
    time: "",
    icon: aiAvatar.value,
    name: "小灵",
    content: "Hi,我是小灵，很高兴遇见你",
    isMe: false,
    status: "done",
  },
]);
// assistantQuestion 发送助手问题的对象
const assistantQuestion = ref<{
  message: string;
  conversationId: string;
  userId: string;
  petId: string;
  onlineImgUrl: string;
  questionId?: string; // 重新生成问题的时候传入
}>({
  message: "",
  conversationId: "",
  userId: "",
  petId: "",
  onlineImgUrl: "",
  questionId: "",
});
// ==================== 创建会话 ===========================
/**
 * 统一处理创建会话的方法
 * @param apiFunc 创建会话的方法
 */
const handleRequestTalkByType = async () => {
  return new Promise(async (r, rj) => {
    const res = await createTalk({
      type: type.value,
    });
    if (res.succeed && res.data) {
      assistantQuestion.value.conversationId = res.data;
      r(true);
    }
    r(false);
  });
};
// 创建新话题
const handleCreate = async () => {
  // 重置聊天
  messageList.value = [
    {
      time: "",
      icon: aiAvatar.value,
      name: "小灵",
      content: "Hi,我是小灵，很高兴遇见你",
      isMe: false,
      status: "done",
    },
  ];
  // 重置会话
  assistantQuestion.value.conversationId = "";
  // 重置问题
  assistantQuestion.value.message = "";
  // 重置图片
  assistantQuestion.value.onlineImgUrl = "";
  // 重置问题id
  assistantQuestion.value.questionId = "";
  // 请求创建会话
  await handleRequestTalkByType();
};
// ================================== 信息相关 ======================================
const handleInputSend = async (messageObj: {
  message: string;
  imageList: Array<string>;
}) => {
  // 赋值问题
  assistantQuestion.value.message = messageObj.message;
  // 只有一张图片
  if (messageObj.imageList.length == 1) {
    assistantQuestion.value.onlineImgUrl = messageObj.imageList[0];
  }
  // 组装一下自己说的
  const myMessage = reactive({
    time: "",
    icon: userInfoStore.getUserAvatar,
    name: userInfoStore.getUserNick,
    content: assistantQuestion.value.message,
    image: assistantQuestion.value.onlineImgUrl,
    isMe: true,
    status: "done",
  });
  // push 到数组
  nextTick(async () => {
    messageList.value.push(myMessage);
    await scrollToBottom();
  });
  // 创建话题
  if (!assistantQuestion.value.conversationId) {
    const res = await handleRequestTalkByType();
    if (!res) {
      handleErrorMessage();
      return;
    }
  }
  // 发送问题 + 获取流式
  await handleRequestSendAndGetStreamByType(messageObj);
};

/**
 * 抽出 发送问题 和 获取流式
 * @param messageObj 发送的消息对象
 */
const handleRequestSendAndGetStreamByType = async (messageObj) => {
  // 发送问题
  const resQuestion = await sendQuestion({
    ...assistantQuestion.value,
    questionId: historyId.value ? assistantQuestion.value.questionId : "",
    type: type.value,
  });
  // 清空图片
  assistantQuestion.value.onlineImgUrl = "";
  // 清空问题
  assistantQuestion.value.message = "";
  // 成功
  if (resQuestion.succeed) {
    // 拿到questionId
    assistantQuestion.value.questionId = resQuestion.data.id;
    // 新增助手消息项
    const assistantMessage = reactive({
      time: "",
      icon: aiAvatar.value,
      name: "小灵",
      content: "",
      isMe: false,
      status: "created",
    });
    // push 到数组
    nextTick(async () => {
      messageList.value.push(assistantMessage);
      await scrollToBottom();
    });
    // 再滚动一下
    await scrollToBottom();
    // 3. 获取流式
    const streamPost = getStream(
      {
        message: messageObj.message,
        conversationId: assistantQuestion.value.conversationId,
        questionId: resQuestion.data.id,
        userId: assistantQuestion.value.userId,
        type: type.value,
      },
      (chunk) => {
        // 在这里 chunk 流式返回的数据， chunk.data.content 是内容
        handleChunk(chunk, assistantMessage);
      }
    );
  } else {
    handleErrorMessage();
  }
};

// 处理chunk 信息
// 修改handleChunk函数，正确处理拼接和打字机效果
const handleChunk = (chunk: any, assistantMessage: any) => {
  console.log("chunk", chunk);
  assistantMessage.status = chunk.status;
  
  // 错误处理
  if (chunk.status == "error") {
    const newContent = chunk.data.content;
    assistantMessage.content = newContent;
    nextTick(() => {
      scrollToBottom();
    });
    return;
  }
  
  // 正常情况 - 流式数据
  if (chunk.status == "answering" && chunk.data?.content) {
    const newContent = chunk.data.content;
    
    // 初始化：如果还没有缓存，创建缓存
    if (!assistantMessage._buffer) {
      assistantMessage._buffer = assistantMessage.content || ""; // 保留已有内容
      assistantMessage._targetLength = assistantMessage._buffer.length;
      assistantMessage._currentLength = assistantMessage._buffer.length;
    }
    
    // 追加新内容到缓存
    assistantMessage._buffer += newContent;
    assistantMessage._targetLength = assistantMessage._buffer.length;
    
    // 开始打字（如果还没开始）
    if (!assistantMessage._typingActive) {
      assistantMessage._typingActive = true;
      typeWriter(assistantMessage);
    }
  }
};

// 修正的打字机函数
const typeWriter = (assistantMessage: any) => {
  const typingSpeed = 50; // 打字速度（毫秒）
  
  const typeNext = () => {
    if (assistantMessage._currentLength < assistantMessage._targetLength) {
      // 每次增加1-2个字符
      const increment = Math.min(2, assistantMessage._targetLength - assistantMessage._currentLength);
      assistantMessage._currentLength += increment;
      
      // 更新显示内容（截取到当前长度）
      assistantMessage.content = assistantMessage._buffer.substring(0, assistantMessage._currentLength);
      
      nextTick(() => {
        scrollToBottom();
      });
      
      // 继续打字
      setTimeout(typeNext, typingSpeed);
    } else {
      // 打字完成
      assistantMessage._typingActive = false;
      
      // 确保内容以换行符结尾
      if (assistantMessage.content && !assistantMessage.content.endsWith('\n')) {
        assistantMessage.content += '\n <br/>';
      }
      
      // 如果是最后一条消息，标记为完成
      if (assistantMessage.status == "answering") {
        assistantMessage.status = "done";
      }
      
      nextTick(() => {
        scrollToBottom();
      });
    }
  };
  
  typeNext();
};

// 清理函数（在需要时调用）
const resetMessageState = (assistantMessage: any) => {
  delete assistantMessage._buffer;
  delete assistantMessage._targetLength;
  delete assistantMessage._currentLength;
  delete assistantMessage._typingActive;
};




// 错误消息处理
const handleErrorMessage = () => {
  // 错误
  const assistantMessage = reactive({
    time: "",
    icon: aiAvatar.value,
    name: "小灵",
    content: "服务器出错，请稍后重试~",
    isMe: false,
    status: "error",
  });
  // push 到数组
  nextTick(async () => {
    messageList.value.push(assistantMessage);
    await scrollToBottom();
  });
};

// ================================ 处理历史记录 ==================================
const handleHistory = async (historyId) => {
  // 助手的历史记录
  const res = await getHistoryDetail({
    historyId: historyId,
    type: type.value,
  });
  if (res.succeed && res.data) {
    // 保存会话id
    assistantQuestion.value.conversationId = res.data.conversationId;
    // list
    messageList.value = res.data.conversationDetailList.map((item, _) => {
      // 自己
      if (item.isUser) {
        return {
          time: "",
          icon: userInfoStore.getUserAvatar,
          name: userInfoStore.getUserNick,
          content: item.showContent,
          isMe: item.isUser,
          status: "done",
          questionId: item.id,
        };
      }
      return {
        time: "",
        icon: aiAvatar.value,
        name: "小灵",
        content: item.showContent,
        isMe: item.isUser,
        status: "done",
        questionId: item.questionId,
      };
    });
  }
};

// ================================== 处理加载的方法 ================================
const historyId = ref(null);
const handleOnLoad = async (options) => {
  // 不同类型的进来
  if (options?.type) {
    // 赋值类型
    type.value = options.type;
  }
  // 助手的历史记录
  if (options?.historyId) {
    // 赋值发送对象
    assistantQuestion.value = JSON.parse(decodeURIComponent(options.assistant));
    // 清空
    messageList.value = [];
    // 赋值
    historyId.value = options.historyId;
    // 请求历史记录
    await handleHistory(options.historyId);
    // 加载插件
    inputFieldRef.value && (inputFieldRef.value as any).managerOnStop();
    return;
  }
  // 基础信息
  if (options?.assistant) {
    // 赋值发送对象
    assistantQuestion.value = JSON.parse(decodeURIComponent(options.assistant));
    // 发送一次
    await handleInputSend({
      message: assistantQuestion.value.message,
      imageList: assistantQuestion.value.onlineImgUrl.split(","),
    });
    // 清空
    assistantQuestion.value.message = "";
    assistantQuestion.value.onlineImgUrl = "";
    // 加载插件
    inputFieldRef.value && (inputFieldRef.value as any).managerOnStop();
    return;
  }
  Tips.toast("网络繁忙，请重试~").then(() => {
    useRouter().back();
  });
};
// 加载
onLoad(async (options) => {
  handleOnLoad(options);
});
// ============================= 底部无关业务 ===============================
// 距离顶部滚动
const scrollTop = ref(0);
// 导航栏高度
const navHeight = ref(0);
// 获取导航栏高度
const getNavHeight = (height: number) => {
  navHeight.value = height;
};
const handleScroll = (e) => {
  // console.log(e);
};
// 滚动到最底部的方法
const scrollToBottom = () => {
  nextTick(() => {
    const query = uni.createSelectorQuery();
    query
      .select("#messageScroll")
      .scrollOffset((res: any) => {
        if (res) {
          // res.scrollHeight 即为滚动内容的总高度
          scrollTop.value = res.scrollHeight + 50;
        }
      })
      .exec();
  });
};
</script>

<style lang="scss" scoped>
.message-list {
  box-sizing: border-box;
  padding: 32rpx 0 32rpx 24rpx;
}
.message-list::-webkit-scrollbar {
  display: none;
  width: 0 !important;
  height: 0 !important;
  -webkit-appearance: none;
  background: transparent;
  color: transparent;
}
</style>
