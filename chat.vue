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
      :scroll-into-view="scrollIntoView"
      :style="{ height: `calc(100vh - ${navHeight}px - 100px)` }"
      @scroll="handleScroll"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <view style="padding-right: 24rpx">
        <view v-for="(item, index) in messageList" :key="index">
          <aiChatItem :item="item" />
        </view>
        <!-- 添加底部锚点 -->
        <view id="bottom-anchor" style="height: 1px"></view>
      </view>
    </scroll-view>

    <!-- 输入框 -->
    <inputField
      ref="inputFieldRef"
      :userInput="assistantQuestion.message"
      @handleSend="handleInputSend"
    />
    <!-- 回到底部  -->
    <wd-transition :show="showScrollBottom" name="fade">
      <view class="scroll-bottom" @click="scrollToBottom">
        <wd-icon name="arrow-down" size="22px" color="#333"></wd-icon>
      </view>
    </wd-transition>
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
const isAnswering = ref(false);
const handleInputSend = async (messageObj: {
  message: string;
  imageList: Array<string>;
}) => {
  // 正在回答中
  if (isAnswering.value) {
    Tips.toast("小灵正在回答中~", 2500);
    return;
  }
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
    // 回答状态
    isAnswering.value = true;
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
    messageList.value.push(assistantMessage);
    setTimeout(() => {
      nextTick(() => {
        scrollToBottom();
      });
    }, 300);
    // 3. 获取流式 -> 这里拿到streamPost 是可以停止请求的，但是UI没做，先留着
    const streamPost = getStream(
      {
        message: messageObj.message,
        conversationId: assistantQuestion.value.conversationId,
        questionId: resQuestion.data.id,
        userId: assistantQuestion.value.userId,
        type: type.value,
      },
      async (chunk) => {
        // 在这里 chunk 流式返回的数据， chunk.data.content 是内容
        await handleChunk(chunk, assistantMessage);
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

  // 结束
  if (chunk.status == "done") {
    isAnswering.value = false;
  }
};

// 修正的打字机函数
const typeWriter = (assistantMessage: any) => {
  const typingSpeed = 50; // 打字速度（毫秒）
  const typeNext = () => {
    if (assistantMessage._currentLength < assistantMessage._targetLength) {
      // 每次增加1-2个字符
      const increment = Math.min(
        2,
        assistantMessage._targetLength - assistantMessage._currentLength
      );
      assistantMessage._currentLength += increment;

      // 更新显示内容（截取到当前长度）
      assistantMessage.content = assistantMessage._buffer.substring(
        0,
        assistantMessage._currentLength
      );

      nextTick(() => {
        if (autoScrollEnabled.value && !isUserTouching.value) {
          scrollToBottom();
        }
      });

      // 继续打字
      setTimeout(typeNext, typingSpeed);
    } else {
      // 打字完成
      assistantMessage._typingActive = false;

      // 确保内容以换行符结尾
      if (
        assistantMessage.content &&
        !assistantMessage.content.endsWith("\n")
      ) {
        assistantMessage.content += "\n <br/>";
      }

      // 如果是最后一条消息，标记为完成
      if (assistantMessage.status == "answering") {
        assistantMessage.status = "done";
      }

      nextTick(() => {
        if (autoScrollEnabled.value && !isUserTouching.value) {
          scrollToBottom();
        }
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
  isAnswering.value = false;
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

  messageList.value.push(assistantMessage);
  setTimeout(() => {
    nextTick(() => {
      scrollToBottom();
    });
  }, 300);
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

// 添加scrollIntoView响应式变量
const scrollIntoView = ref("");
// 修改滚动到最底部的方法
const scrollToBottom = () => {
  nextTick(() => {
    scrollIntoView.value = "bottom-anchor";
    // 滚动到底部时重置状态
    hasScrolledUp.value = false;
    showScrollBottom.value = false;
    // 重新启用自动滚动
    autoScrollEnabled.value = true;
    setTimeout(() => {
      scrollIntoView.value = "";
    }, 300);
  });
};

// 控制回到底部按钮的显示/隐藏
const showScrollBottom = ref(false);

// 添加变量记录滚动基准位置
const lastScrollTop = ref(0);
const hasScrolledUp = ref(false);

// 控制是否自动滚动到底部
const autoScrollEnabled = ref(true);

const handleScroll = (e) => {
  const currentScrollTop = e.detail.scrollTop;
  const scrollHeight = e.detail.scrollHeight;

  uni
    .createSelectorQuery()
    .select("#messageScroll")
    .boundingClientRect((rect) => {
      if (rect) {
        const containerHeight = (rect as any).height;
        const maxScrollTop = scrollHeight - containerHeight;
        const distanceFromBottom = maxScrollTop - currentScrollTop;
        // 检测用户滚动行为
        if (currentScrollTop < lastScrollTop.value - 10) {
          // 用户向上滚动
          hasScrolledUp.value = true;
          autoScrollEnabled.value = false;
        } else if (currentScrollTop > lastScrollTop.value + 10) {
          // 用户向下滚动，检查是否接近底部
          if (distanceFromBottom < 20) {
            // 距离底部20px内
            hasScrolledUp.value = false;
            autoScrollEnabled.value = true;
          }
        }

        lastScrollTop.value = currentScrollTop;
        showScrollBottom.value = hasScrolledUp.value;
      }
    })
    .exec();
};

// 添加触摸相关变量和函数
const isUserTouching = ref(false);
const touchStartY = ref(0);
const handleTouchStart = (e) => {
  // 用户开始触摸，立即停止自动滚动
  autoScrollEnabled.value = false;
  isUserTouching.value = true;
  touchStartY.value = e.touches[0].clientY;
};

const handleTouchMove = (e) => {
  // 用户正在滑动，确保自动滚动保持关闭
  if (isUserTouching.value) {
    autoScrollEnabled.value = false;
  }
};

const handleTouchEnd = (e) => {
  // 用户触摸结束
  isUserTouching.value = false;
  // 检查用户是否滚动到了底部，如果是则重新启用自动滚动
  setTimeout(() => {
    uni
      .createSelectorQuery()
      .select("#messageScroll")
      .boundingClientRect((rect) => {
        if (rect) {
          const query = uni.createSelectorQuery();
          query
            .select("#messageScroll")
            .scrollOffset((scrollRes) => {
              if (scrollRes) {
                const containerHeight = (rect as any).height;
                const scrollHeight = (scrollRes as any).scrollHeight;
                const currentScrollTop = (scrollRes as any).scrollTop;
                const maxScrollTop = scrollHeight - containerHeight;
                const distanceFromBottom = maxScrollTop - currentScrollTop;
                if (distanceFromBottom < 20) {
                  // 用户滚动到了底部，重新启用自动滚动
                  autoScrollEnabled.value = true;
                }
              }
            })
            .exec();
        }
      })
      .exec();
  }, 100);
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

.chat {
  position: relative;
}
.scroll-bottom {
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  bottom: 50px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  padding: 12rpx;
  border-radius: 50%;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
</style>
