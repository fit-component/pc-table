import React from 'react'
import { shallow, mount } from 'enzyme'
import Table from 'fit-table'

describe('fit-table', ()=> {
    it('默认数据渲染成功', ()=> {
        const info = {
            fields: [{
                key: 'id',
                value: 'ID'
            }, {
                key: 'name',
                value: '用户名'
            }, {
                key: 'department',
                value: '部门'
            }, {
                key: 'age',
                value: '年龄'
            }],
            datas: [{
                id: 0,
                name: '郭富城',
                department: '无人车事业部',
                age: 32
            }, {
                id: 1,
                name: '陈冠希',
                department: '云计算部',
                age: 26
            }, {
                id: 2,
                name: '张学友',
                department: '大数据部',
                age: 36
            }]
        }
        const node = mount(<Table {...info}/>)
        expect(node.text()).to.contain('陈冠希')
    })
})
