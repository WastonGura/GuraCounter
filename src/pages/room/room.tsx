import { View, Text } from '@tarojs/components'
import './room.scss'

const Room = () => {
  return (
    <View className='room-container'>
        <View className='room-content'>
          <View className='user'>
            <Text className='username'>小古拉</Text>
          </View>

          <View className='players'>
            <Text>0</Text>
          </View>
        </View>

    </View>
    )
}

export default Room