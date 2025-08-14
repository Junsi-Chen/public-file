<template>
	<view>
		<snapshot :id="snapId" mode="view" :style="{width:width + 'rpx'}" :class="{'off-screen':isHide}">
			<slot></slot>
		</snapshot>
	</view>

</template>

<script>
	// snapshot 页面元素截图组件
	
	// 相关文档查看：https://developers.weixin.qq.com/miniprogram/dev/component/snapshot.html
	// 正常用组件包在需要截图的内容的外层即可

	// 注意！！！
	// 1.需要使用的页面开启skyline渲染模式，如何开启参考pages.json里面 pages/mine/mine-qr 的页面配置
	// 2.很多uniapp的组件库不兼容skyline渲染模式，如果页面需要截图，在开始做页面的时候就启用skyline确保snapshot能正常使用
	export default {
		props: {
			// 如果页面上有多个snapshot时传
			snapId: {
				type: String,
				default: 'snapshot-view'
			},
			// 是否开启离屏渲染,一般要先调好样式再开启这个模式,1.需要导出倍图,2.截图内容不需要在页面展示时使用
			isHide: {
				type: Boolean,
				default: false
			},
			// 截图区域的宽度
			width: {
				type: String | Number,
				default: 500
			}
		},
		methods: {
			snapshot(cb) {
				this.$nextTick(() => {
					this.createSelectorQuery()
						.select("#" + this.snapId)
						.node()
						.exec(res => {
							const node = res[0].node
							node.takeSnapshot({
								type: 'file',
								format: 'png',
								success: async (result) => {
									cb && cb(result.tempFilePath)
									this.$emit('confirm', result.tempFilePath)
								},
								fail(err) {
									console.log(err);
								},
								complete() {
									console.log('takeSnapshot:complete')
								}
							})
						})
				})
			}
		}
	}
</script>

<style lang="scss">
	.off-screen {
		position: fixed;
		left: 0;
		top: 0;
		transform: scale(0)
	}
</style>