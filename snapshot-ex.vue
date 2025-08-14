<template>
	<view class="qr-container">
		<view class="content bg"></view>
		<view class="content flex align-center flex-col justify-center">
			<!-- 自定义标题 -->
			<custom-nav @getNavHeight="getNavHeight" :scrollTop="scrollTop" />

			<!-- 导航栏的高度 -->
			<!-- <view class="w100-per" :style="{height: navHeight + 'px'}"></view> -->
			<snapshot-view ref="snapshotRef" :width="654">
				<view v-if="!loaded" class="qr-bar flex flex-col align-center">
					<view>正在生成名片，请稍后...</view>
				</view>
				<view v-if="loaded" class="qr-bar flex flex-col">
					<view class="w100-per flex">
						<view class="avatar-box margin-right">
							<image :src="userInfo.profile.avatar" mode="aspectFill" class="w100-per h100-per"></image>
							<!-- 男生 -->
							<view v-if="userInfo.profile.gender == 1" class="gender-box man">
								<uni-icons style="margin:0 0 1px 1px" custom-prefix="banzhu" size="12" type="icon-nan1"
									color="#fff"></uni-icons>
							</view>
							<!-- 女生 -->
							<view v-if="userInfo.profile.gender == 0" class="gender-box woman">
								<uni-icons style="margin:0 0 3px -1px" custom-prefix="banzhu" size="12" type="icon-nv"
									color="#fff"></uni-icons>
							</view>
						</view>
						<view class="flex-1">
							<view class="nick-box flex align-center w100-per" @click.stop>
								<text class="text-nowrap">{{userInfo.profile.nick || ''}}</text>
								<!-- 是会员的时候显示对应的会员标 -->
								<image v-if="userInfo.profile.vipLevel>0" class="vip-icon"
									:src="`https://bzstatic.udinovo.com/20231019vip-${userInfo.profile.vipLevel}.png`"
									mode="aspectFit" />
							</view>
							<view class="more-msg">{{userInfo.location || ''}}</view>
						</view>
					</view>
					<view class="margin-top-xl">
						<image :src="userInfo.profile.pqrcode" style="width:558rpx;height:558rpx"></image>
					</view>
					<view class="more-msg margin-top-xl text-center">扫一扫上方的二维码查看个人主页</view>
				</view>
			</snapshot-view>
			<view v-if="loaded" class="btn margin-top-xl" @click.stop="generatePictures">
				<uni-icons class="margin-right-sm" custom-prefix="banzhu" size="16" type="icon-fenxiang11"
					color="#fff"></uni-icons>
				<text>分享给朋友</text>
			</view>
		</view>

	</view>
</template>

<script>
	import {
		profilesPageCombo
	} from '@/pages/api/api'
	export default {
		data() {
			return {
				navHeight: 44,
				uid: '',
				userInfo: '',
				shareImg: '',
				loaded: false
			}
		},
		onLoad(opt) {
			if (opt.uid) {
				this.uid = opt.uid * 1
			}
			this.profilesPageCombo()
		},
		methods: {
			// 获取个人中心信息
			async profilesPageCombo() {
				this.loaded = false
				const res = await profilesPageCombo({
					toUid: this.uid || uni.getStorageSync('loginInfo').uid
				})
				this.loaded = true
				if (res.errno == 0) {
					this.userInfo = res.data
					this.$forceUpdate()
				}
			},
			getNavHeight(navHeight) {
				this.navHeight = navHeight
			},
			generatePictures() {
				// 生成了截图就不用重新生成了
				if (this.shareImg) {
					wx.showShareImageMenu({
						path: this.shareImg
					})
					return
				}
				this.$refs.snapshotRef.snapshot(imgUrl => {
					wx.showShareImageMenu({
						path: imgUrl
					})
					this.shareImg = imgUrl
				})
			},
		}
	}
</script>
<style>
	page {
		padding: 0 !important;
	}

	view {
		box-sizing: border-box;
	}
</style>
<style lang="scss">
	.qr-container {
		width: 100%;
		min-height: 100%;
		background: linear-gradient(180deg, #FFB66D 0%, #FF862F 100%);
		position: relative;

		.content {
			width: 100%;
			height: 100%;
			position: absolute;
			left: 0;
			top: 0;
			z-index: 2;

			&.bg {
				background: url(https://bzstatic.udinovo.com/hscl_qiniu_17425361337076.png) lightgray 50% / cover no-repeat;
				background-blend-mode: hard-light;
				mix-blend-mode: lighten;
				z-index: 1;
			}
		}

		.qr-bar {
			width: 654rpx;
			height: 960rpx;
			border-radius: 24rpx;
			background: #FFF;
			box-shadow: 0px 330px 92px 0px rgba(138, 55, 0, 0.00), 0px 211px 84px 0px rgba(138, 55, 0, 0.01), 0px 119px 71px 0px rgba(138, 55, 0, 0.05), 0px 53px 53px 0px rgba(138, 55, 0, 0.09), 0px 13px 29px 0px rgba(138, 55, 0, 0.10);
			padding: 48rpx;

			.avatar-box {
				width: 56px;
				height: 56px;
				position: relative;

				image {
					border: 1px solid #fff;
					border-radius: 56px;
				}

				.gender-box {
					width: 32rpx;
					height: 32rpx;
					border-radius: 32rpx;
					position: absolute;
					right: 0;
					bottom: 0;
					display: flex;
					align-items: center;
					justify-content: center;
					z-index: 99;

					&.man {
						background-color: rgba(68, 151, 247, 1);
					}

					&.woman {
						background-color: rgba(234, 72, 173, 1);
					}
				}
			}

			.more-msg {
				color: rgba(0, 0, 0, 0.40);
				font-size: 24rpx;
				font-weight: 400;
				line-height: 40rpx;
			}

			.nick-box {
				color: rgba(0, 0, 0, 0.90);
				font-size: 40rpx;
				font-weight: 600;
				line-height: 56rpx;

				.vip-icon {
					width: 32rpx;
					height: 32rpx;
					margin-left: 8rpx;
				}
			}
		}

		.btn {
			display: flex;
			width: 606rpx;
			height: 104rpx;
			justify-content: center;
			align-items: center;
			border-radius: 24rpx;
			background: linear-gradient(0deg, #FE6A00 0%, #FE6A00 100%), conic-gradient(from -3deg at 100% -13%, #FFA502 0deg, #FF6348 360deg);
			color: #FFF;
			text-align: center;
			font-size: 28rpx;
			font-weight: 600;
			line-height: 104rpx;

			&.margin {
				margin-top: 354rpx;
			}

		}
	}
</style>