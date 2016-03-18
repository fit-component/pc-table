import React from 'react'
import Table from 'fit-table'
import Button from 'fit-button'

const info = {
    fields  : [{
        key  : 'value',
        value: '元字符'
    }, {
        key  : 'description',
        value: '描述'
    }],
    get     : {
        url       : '/api/table/regex',
        method    : 'get',
        beforeSend: (info, currentPage)=> {
            info.page = currentPage
            return info
        },
        success   : (res, pagination)=> {
            pagination.next = res['has_next']
            return res['data']
        }
    },
    selector: {
        type: 'checkbox'
    },
    extend  : (table)=> {
        const handleClick = (type)=> {
            switch (type) {
            case 'select':
                console.log(table.getCurrentSelectRows())
                break
            case 'all':
                console.log(table.getAllRows())
                break
            case 'notSelect':
                console.log(table.getCurrentNotSelectRows())
                break
            }
        }

        const jumpHome = ()=> {
            table.jump(table.currentPage())
        }

        function Delete() {
            let currentSelectRows = table.getCurrentSelectRows()
            table.mockDeleteData(currentSelectRows)

            setTimeout(() => {
                console.log(table.getData())
            })
        }

        return (
            <div>
                <Button type="success"
                        onClick={handleClick.bind(this,'select')}>获取选中</Button>
                <Button type="success"
                        onClick={handleClick.bind(this,'all')}
                        style={{marginLeft:10}}>获取全部</Button>
                <Button type="success"
                        onClick={handleClick.bind(this,'notSelect')}
                        style={{marginLeft:10}}>获取未选中</Button>
                <Button type="primary"
                        onClick={jumpHome}
                        style={{marginLeft:10}}>刷新</Button>
                <Button onClick={Delete}
                        style={{marginLeft:10}}>模拟删除</Button>
            </div>
        )
    }
}

export default class Demo extends React.Component {
    render() {
        return (
            <Table {...info}/>
        )
    }
}