import { TextDecoder } from "text-encoding-shim";
// 基础路径
const BASE_URL = import.meta.env.VITE_BASE_API || "";
// 流式解析器
type SSEMessage = {
  event: string;
  data: string;
  id: string | null;
  retry: number | null;
};
type MessageCallback = (message: SSEMessage) => void;
// SSE 解析器
class SSEParser {
  private buffer: string = "";
  private onMessage: MessageCallback;

  constructor(onMessage: MessageCallback) {
    this.onMessage = onMessage;
  }

  processChunk(arrayBuffer: ArrayBuffer): void {
    const chunk = this._arrayBufferToString(arrayBuffer);
    this.buffer += chunk;

    const messageDelimiter = /\r?\n\r?\n/g;
    let position: RegExpExecArray | null;

    while ((position = messageDelimiter.exec(this.buffer)) !== null) {
      const message = this.buffer.substring(0, position.index);
      this.buffer = this.buffer.substring(position.index + position[0].length);

      if (message.trim()) {
        this._parseAndDispatchMessage(message);
      }

      messageDelimiter.lastIndex = 0;
    }
  }

  private _parseAndDispatchMessage(message: string): void {
    const lines = message.split(/\r?\n/);
    const parsedMessage: SSEMessage = {
      event: "message",
      data: "",
      id: null,
      retry: null,
    };

    let currentDataLine = 0;

    lines.forEach((line) => {
      if (!line.trim()) return;

      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) return;

      const field = line.substring(0, colonIndex);
      let value = line.substring(colonIndex + 1);

      if (value.startsWith(" ")) {
        value = value.substring(1);
      }

      switch (field) {
        case "event":
          parsedMessage.event = value;
          break;
        case "data":
          parsedMessage.data += (currentDataLine > 0 ? "\n" : "") + value;
          currentDataLine++;
          break;
        case "id":
          parsedMessage.id = value;
          break;
        case "retry":
          parsedMessage.retry = parseInt(value, 10);
          break;
      }
    });

    if (parsedMessage.data) {
      this.onMessage(parsedMessage);
    }
  }

  private _arrayBufferToString(buffer: ArrayBuffer): string {
    const decoder = new TextDecoder("utf-8");
    const chunk = decoder.decode(new Uint8Array(buffer));
    return chunk;
  }
}

// 处理消息
const handleMessage = (message: SSEMessage) => {
  return new Promise((r, rj) => {
    // 0. error 错误的时候
    if (message.event == "error") {
      r({
        status: "error",
        data: {
          content: "网络繁忙，请稍后重试~",
        },
      });
      return;
    }
    // 转对象
    const data = JSON.parse(message.data);
    // 1. 如果是created 创建完成
    if (message.event == "conversation.chat.created") {
      r({
        status: "created",
        data: {},
      });
      return;
    }
    // 2. 如果是conversation.chat.in_progress 进行中
    if (message.event == "conversation.chat.in_progress") {
      r({
        status: "progress",
        data: {},
      });
      return;
    }
    // 3. 如果是completed 并且 type == 'answer' 证明已经回答完成
    if (
      message.event == "conversation.message.completed" &&
      (data as any)?.type == "answer"
    ) {
      r({
        status: "completed",
        data: {},
      });
      return;
    }
    // 4. 如果是completed 并且 type == 'verbose' 不需要
    if (
      message.event == "conversation.message.completed" &&
      (data as any)?.type == "verbose"
    ) {
      r(false);
      return;
    }
    // 5. 如果是completed 并且 status == 'completed' 不需要
    if (
      message.event == "conversation.chat.completed" &&
      (data as any).status == "completed"
    ) {
      r(false);
      return;
    }
    // 6. done
    if (message.event == "done") {
      r({
        status: "done",
        data: {},
      });
    }
    // 7 正常的
    r({
      status: "answering",
      data: data,
    });
  });
};

// 获取流式
export const petStreamConversation = (url, data, cb) => {
  // token信息
  const auth = useAuthStore();
  // 当前路由信息
  const currentRouter = getCurrentPath();
  if (!auth.getAuthorization?.accessToken) {
    uni.navigateTo({
      url: `/pages/register/index?redirect=${
        currentRouter.path + "?query=" + currentRouter.query
      }`,
    });
    return;
  }

  // 请求路径
  let requestUrl = BASE_URL + url;

  const header = {
    "Content-Type": "application/json",
    // 请求端 CLIENT || ADMIN  为了调试，用了ADMIN平台
    "app-client": "CLIENT",
    // 平台
    "app-platform": "WX_MA",
    // 版本
    "app-version": uni.getAppBaseInfo().appVersion + "",
    // 手机系统
    "app-system": uni.getDeviceInfo().system + "",
    Authorization: auth.getAuthorization?.accessToken,
    Accept: "text/event-stream;charset=UTF-8",
    "X-AcA-DataInspection": "enable",
    "X-AcA-SSE": "enable",
    "x-fag-servicename": "aca-chat-send-sse",
    "x-fag-appcode": "aca",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  };
  // 创建 SSE 解析器实例
  const sseParser = new SSEParser(async (message) => {
    // 处理解析后的消息
    try {
      const resData = await handleMessage(message);
      if (resData) {
        // 将解析后的JSON数据传递给回调函数;
        cb(resData);
      }
    } catch (e) {
      console.error("解析SSE数据失败:", e, message.data);
    }
  });
  // 这里需要用到wx.，onChunkReceived 才不会报错 TODO
  const requstTask = wx.request({
    url: requestUrl,
    data,
    method: "POST",
    header,
    enableChunked: true,
    timeout: 1000 * 60 * 10,
    fail: (err) => {
      console.error("请求失败:", err);
    },
  });
  // 监听，并将数据块传递给解析器处理
  requstTask.onChunkReceived((res) => {
    sseParser.processChunk(res.data);
  });
};
