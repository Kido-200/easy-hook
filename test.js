let isMount = true
//当前处理的hook,不要忘记mount的时候创建hook也是在处理hook,建立链表就靠他了
let workInProgressHook = null

//触发set后,状态是在这里更新的,这是以前没想过的。以前一直以为set那里触发状态更新。
//因为触发set就要触发组件更新,即schedule(fiber)即fn()所以useState也会被再次执行
//所以在这次处理update十分合理
function useState(initialState){
  let hook

  //首次渲染要创建hook
  if(isMount){
    hook = {
      memoizedState: initialState,
      next: null,
      queue:{
        //保存最新的update
        //每次set调用都是在这个链表里添加进去了()里的参数(obj或fn)
        pending: null
      }
    }
    //hook链表头
    if(!fiber.memoizedState){
      fiber.memoizedState = hook
    }else{
      workInProgressHook.next = hook
    }
    workInProgressHook = hook
  }
  //update情况
  else{
    //hook去从hooks链表里取出来
    hook = workInProgressHook
    workInProgressHook = hook.next
  }
  //hook获得完毕

  //判断是否有update需要执行
  let baseState = hook.memoizedState

  if(hook.queue.pending){
    //最新的pending是链表尾再next就到真正的update链表头了
    let firstUpdate = hook.queue.pending.next
    //循环执行update双向链表
    do{
      const action = firstUpdate.action
      baseState = action(baseState)
      firstUpdate = firstUpdate.next
    } while(firstUpdate !== hook.queue.pending.next)

    //计算完毕清空
    hook.queue.pending = null
  }
  hook.memoizedState = baseState

  //bind有函数柯里化
  return [baseState,dispatchAction.bind(null,hook.queue)]
}

//在react里调用set有单独的这个方法,这里实现函数参数
//每次set执行,都给这个set对应的hook.queue.pending链表里添加这个action
//只是给hook里添加了action,并触发schedule这里并没有真正update state, update state在useState
//这个set是所有hook统一的set方法,所以要传入queue来知道是给哪个hook的queue添加
function dispatchAction(queue,action){
  //实际react是有优先级的
  //update是双向链表
  const update = {
    action,
    next: null
  }

  //链表为空
  if(queue.pending === null){
    //u0 -> u0
    update.next = update
  }else{
    //u0 ->  u0
    //u0  ->  u1  -> u0
    //u0  ->  u1  -> u2  -> u0
    //u0 -> u1 -> u2 -> u3  -> u0
    //画成上面这样好理解,他那样太绕了,就是个双线链表的后端插入方法
    update.next = queue.pending.next
    queue.pending.next = update
  }
  //queue.pending永远是链表最后一个(看成单向,也就是最新的update)
  queue.pending = update
  //触发一次更新
  //这里我们没有实现update合并,所以多少个update触发多少更新
  //所以我们只实现了函数参数的update
  schedule()
}


const fiber = {
  stateNode:App,
  //class component保存this.state
  //function component是保存的对应hooks的数据 链表的形式
  memoizedState:null
}

//调度
function schedule(){
  //update时这里就能让他=链表头了
  workInProgressHook = fiber.memoizedState
  //然后进行stateNode的执行,stateNode内部调用setState时,workInProgressHook就能实现链表遍历了
  const app = fiber.stateNode()
  isMount = false
  return app
}

//useState其实是与useReducer实现的机制是一致的,预置了一个reducer函数
//updateState会返回updateReducer(默认reducer,params)
//而set()里面函数还是对象,相应的返回值就是这个预置reducer进行的判断

function App(){
  const [num,updateNum] = useState(0)
  const [num1,updateNum1] = useState(10)
  console.log('isMount',isMount);
  console.log('num',num);
  console.log('num1',num1);
  return {
    onClick(){
      updateNum(num => num + 1)
    },
    onFocus(){
      updateNum1( num1 => num1 + 10)
    }
  }
}

window.app = schedule()