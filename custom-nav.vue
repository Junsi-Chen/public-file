<template>
  <view>
    <view class="navbar" :style="{ backgroundColor: bgColor, zIndex: zindex }">
      <view :style="{ height: tops + 'px' }"></view>
      <view
        :style="{ height: height + 'px', lineHeight: height + 'px' }"
        class="nav-box"
      >
        <view class="mainbox" :style="{ width: widtH + 'px', height: '100%' }">
          <slot name="lf" :status="status">
            <view class="nav-bar-lf">
              <wd-icon
                name="arrow-left"
                custom-class="wd-navbar__arrow"
                :color="backColor"
                size="24px"
                @click="back"
              />
            </view>
          </slot>
          <view class="flex justify-start flex-1 nav-bar-lf-content">
            <slot name="lf-content"></slot>
          </view>
          <slot name="lc" :style="{ height: height + 'px', color: titColor }">
            <view
              class="nav-bar-lc"
              :style="{ color: titColor }"
              v-if="status > 0 || alway"
            >
              {{ title || "" }}
            </view>
          </slot>
          <slot name="lr" :style="{ height: height + 'px' }" v-if="isRbtn">
            <view class="nav-bar-lr">
              <wd-icon :name="ricon" :color="titColor" @click="handRbtn" />
            </view>
          </slot>
        </view>
      </view>
    </view>
    <!-- 占位元素，高度等于导航栏总高度 -->
    <view :style="{ height: (height + tops) + 'px' }"></view>
  </view>
</template>

<script lang="ts" setup>
const props = defineProps({
  title: {
    type: String,
    default: "",
  },
  scrollTop: {
    type: Number,
    default: 0,
  },
  titColor: {
    type: String,
    default: "rgba(0, 0, 0, 0.90)",
  },
  backColor: {
    type: String,
    default: "#333",
  },
  zindex: {
    type: Number,
    default: 1,
  },
  alway: {
    type: Boolean,
    default: false,
  },
  isRbtn: {
    type: Boolean,
    default: false,
  },
  ricon: {
    type: String,
    default: "search",
  },
});

const emits = defineEmits(["getNavHeight", "onRight"]);

const height = ref(0);
const widtH = ref(0);
const tops = ref<any>(0);
const status = ref(0); // 标题栏背景渐变状态： 0 -> 初始位置 1-->开始渐变 2--> 固定颜色

const bgColor = computed(() => {
  // 非空判断
  if (!props.scrollTop || props.scrollTop < 10) {
    status.value = 0;
    return "rgba(255,255,255,0)";
  }
  // 固定位置
  if (props.scrollTop > 100) {
    status.value = 2;
    return "rgba(255,255,255,1)";
  }
  // 不需要频繁赋值
  if (status.value !== 1) status.value = 1;
  const opacity = props.scrollTop / 100;
  return `rgba(255,255,255,${opacity})`;
});

onMounted(() => {
  uni.getSystemInfo({
    success: (e) => {
      // 计算安全高度
      tops.value = e.statusBarHeight;
      const custom = uni.getMenuButtonBoundingClientRect();
      // 标题栏高度
      height.value = custom.height + (custom.top - tops.value) * 2;
      // 计算标题栏减去 胶囊的宽度
      widtH.value = e.windowWidth - custom.width - 10;
      // return 整个标题栏高度，用于内容做限制区域
      emits("getNavHeight", height.value + tops.value);
    },
  });
});

const back = () => {
  // 获取当前页面栈
  const pages = getCurrentPages();
  // 获取当前页面
  const currentPage = pages[pages.length - 1];
  // 判断当前页面是否为首页（即是否有上一页）
  if (pages.length === 1 || currentPage.route === "index") {
    uni.reLaunch({
      url: "/pages/index/index",
    });
  } else {
    uni.navigateBack();
  }
};

const handRbtn = () => {
  emits("onRight");
};
</script>

<style>
.navbar {
  width: 100%;
  position: fixed;
  top: 0px;
}

.nav-box {
  width: 100%;
  position: relative;
}

.mainbox {
  display: flex;
  align-items: center;
  /* #ifdef   H5 || APP */
  height: 45px !important;
  line-height: 45px;
  /* #endif */
}

.nav-bar-lf-content {
  height: 100%;
}

.nav-bar-lf {
  width: 45px;
  height: 100%;
  text-align: center;
}

.nav-bar-lc {
  height: 100%;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  position: absolute;
  width: 350rpx;
  left: 50%;
  top: 0;
  margin-left: -175rpx;
  color: rgba(0, 0, 0, 0.9);
  font-size: 16px;
  font-weight: 600;
}

.nav-bar-lr {
  width: 50px;
  height: 100%;
  text-align: center;
}
</style>