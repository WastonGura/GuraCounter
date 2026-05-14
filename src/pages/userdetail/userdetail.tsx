import { View, Image, Text } from '@tarojs/components'
import './userdetail.scss'
import avatarDefault from '../../assets/images/avatar.png'
import changeIcon from '../../assets/icons/pen.svg'
import Taro from '@tarojs/taro'

const UserDetail = () => {
  const handleAvatarClick = async () => {
    console.log("更换头像按钮被点击");
    await Taro.vibrateShort({
      type: 'light'
    })
  }

  return (
    <View className='userdetail-container'>
        <View className='userdetail-info'>
            <View className='userdetail-info-avatar' hoverClass='userdetail-info-avatar--active' hoverStartTime={0} hoverStayTime={100} onClick={handleAvatarClick}>
                <Image className='avatar' src={avatarDefault} />

                <View className='change-icon'>
                  {/* 更换头像图标 */}
                  <Image className='icon' src={changeIcon} />
                </View>
            </View>

            <View className='userdetail-info-name'>
                {/* 用户昵称 */}
                <Text className='name'>小古拉</Text>
            </View>

            <View className='userdetail-info-rate'>
                {/* 用户胜率栏 */}
                <Text className='win-times'>赢：3</Text>
                <Text className='lose-times'>输：1</Text>
                <Text className='win-rate'>胜率：75%</Text>
            </View>
        </View>

        <View className='userdetail-history'>
            {/* 用户战绩 */}
            <View className='history-title'>战绩</View>

            <View className='history-list'>
                <Text className='history-empty'>暂无记录</Text>
            </View>
        </View>
    </View>
    )
}

export default UserDetail
