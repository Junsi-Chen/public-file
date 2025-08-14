# AI-SSE 要注意，如果是移动端，需要叫后端配nignx（有可能）
# 可能需要用到的文档 https://blog.csdn.net/u013534071/article/details/131500873
``` nignx配置
# 新增：针对 SSE 接口的配置（重点修改部分）
        location /api/ai/portal/chat/petAssistantStreamConversation {
        # 代理到后端服务（和根路径一致，保持后端地址统一）
        proxy_pass http://172.29.102.251:10999;
        proxy_http_version 1.1;

        # SSE 核心参数（禁用缓冲和缓存，保持长连接）
        proxy_buffering off;        # 关闭缓冲（关键：防止 SSE 流被缓存）
        proxy_cache off;            # 关闭缓存
        proxy_set_header Connection '';  # 禁用连接复用，保持长连接
        chunked_transfer_encoding on;    # 支持分块传输（SSE 依赖）

        # 传递客户端信息（和根路径保持一致）
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 延长超时时间（SSE 连接可能长时间保持，建议设大些，如 1小时）
        proxy_read_timeout 3600s;   # 读取超时（关键：避免连接被过早断开）
        proxy_send_timeout 3600s;
        proxy_connect_timeout 60s;

        # 禁用加速缓冲（进一步确保无缓存）
        add_header X-Accel-Buffering "no";
        }
```

# chat 支持打字机效果

# 可能会用到的项目地址：https://gitee.com/hjhspace
