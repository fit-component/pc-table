import React from 'react'
import Input from 'fit-input'
import Button from 'fit-button'
import {Select, Option} from 'fit-select'
import {DateInput} from 'fit-datepicker'
import Timepicker from 'fit-timepicker'
import $ from 'jquery'
import _ from 'lodash'
import './index.scss'

const toString = (value)=> {
    if (!value) {
        return null
    }
    return value.toString()
}

export default class Finder extends React.Component {
    constructor(props) {
        super(props)

        let finder = this.props.finder

        // 设置defaultValue
        finder.map((item)=> {
            item.value = item.value || item.defaultValue || ''
            if (item.type === 'enum') {
                item.enum.map((elItem)=> {
                    elItem.value = elItem.value || elItem.defaultValue || ''
                })
            }
        })

        this.state = {
            opts   : finder,
            loading: false
        }

        this.getChilds = (lists, notEnum = false, parentIndex = -1)=> {
            return lists.map((item, index)=> {
                let itemStyle = {
                    marginLeft: index === 0 || notEnum ? null : 10,
                    width     : item.width || null,
                    display   : 'flex'
                }

                switch (item.type) {
                case 'text':
                    return (
                        <Input {...item.props}
                            key={'item'+index}
                            style={itemStyle}
                            label={item.label}
                            value={item.value}
                            onChange={this.handleChange.bind(this,index,parentIndex)}/>
                    )
                case 'select':
                    let Options = item.select.map((elItem, elIndex)=> {
                        return (
                            <Option {...item.props}
                                style={itemStyle}
                                key={elIndex}
                                label={item.label}
                                value={toString(elItem.key)}>{elItem.value}</Option>
                        )
                    })

                    if (item.defaultValue !== undefined) {
                        item.defaultValue = toString(item.defaultValue)
                    }

                    return (
                        <Select {...item.props}
                            style={itemStyle}
                            key={'item'+index}
                            label={item.label}
                            value={toString(item.value)||item.defaultValue||item.select[0].key}
                            onChange={this.handleChange.bind(this,index,parentIndex)}>
                            {Options}
                        </Select>
                    )
                case 'time':
                    return (
                        <Timepicker {...item.props}
                            key={'item'+index}
                            style={itemStyle}
                            input={{label:item.label}}
                            defaultValue={item.value}
                            onChange={this.handleChangeDate.bind(this,index,parentIndex,item.format)}/>
                    )
                case 'date':
                    let dateStyle = _.cloneDeep(itemStyle)

                    return (
                        <DateInput {...item.props}
                            key={'item'+index}
                            style={dateStyle}
                            input={{label:item.label}}
                            width={item.width || null}
                            defaultValue={item.value}
                            onChange={this.handleChangeDate.bind(this,index,parentIndex,item.format)}/>
                    )
                case 'enum':
                    if (notEnum)break
                    // 循环出option列表
                    let EnumOptions = item.enum.map((elItem, elIndex)=> {
                        return (
                            <Option key={elIndex}
                                    value={elItem.key}>{elItem.label}</Option>
                        )
                    })

                    // 显示当前的child
                    let Children = null
                    let Childrens = this.getChilds(item.enum, true, index)
                    item.enum.map((elItem, elIndex)=> {
                        if (elItem.key === (item.value || item.defaultValue)) {
                            Children = Childrens[elIndex]
                        }
                    })

                    return (
                        <div key={'item'+index}
                             style={itemStyle}>
                            <Select onChange={this.handleEnumChange.bind(this,index)}
                                    width={item.width || null}
                                    key={index}
                                    value={item.value || item.defaultValue}>
                                {EnumOptions}
                            </Select>
                            {Children}
                        </div>
                    )
                }
            })
        }
    }

    // 选项被修改
    handleChange(index, parentIndex, value) {
        let newOpts = this.state.opts

        // 兼容 event
        value = value.target ? value.target.value : value

        if (parentIndex === -1) {
            newOpts[index].value = value
        } else {
            newOpts[parentIndex].enum[index].value = value
        }

        this.setState({
            opts: newOpts
        })
    }

    // 修改的选项是时间类型,做预处理
    handleChangeDate(index, parentIndex, format = 'YYYY-MM-DD HH:mm:ss', value) {
        if (value.format) {
            this.handleChange(index, parentIndex, value.format(format))
        } else {
            this.handleChange(index, parentIndex, {
                start: value.startDate.format(format),
                end  : value.endDate.format(format)
            })
        }
    }

    // enum被修改
    handleEnumChange(index, value) {
        let newOpts = this.state.opts
        newOpts[index].value = value
        this.setState({
            opts: newOpts
        })
    }

    handleSearch() {
        // 查出当前提交参数
        let params = {}
        this.state.opts.map((item)=> {
            if (item.type === 'enum') {
                item.enum.map((elItem)=> {
                    if (elItem.key === item.value && elItem.value) {
                        if (elItem.beforeSend) {
                            let newParams = elItem.beforeSend(elItem.key, elItem.value)
                            params = $.extend(params, newParams)
                        } else {
                            params[elItem.key] = elItem.value
                        }
                    }
                })
                return
            }

            if (item.value) {
                if (item.beforeSend) {
                    let newParams = item.beforeSend(item.key, item.value)
                    params = $.extend(params, newParams)
                } else {
                    params[item.key] = item.value
                }
            }
        })

        this.props.onSearch(params)
    }

    render() {
        let Finders = this.getChilds(this.state.opts)

        return (
            <div className="_namespace">
                {Finders}
                <div style={{flexGrow:1,display:'flex',justifyContent:'center',alignItems:'center'}}>
                    <Button addonLeft="search"
                            onClick={this.handleSearch.bind(this)}
                            loading={this.state.loading}
                            type="default">查询</Button>
                </div>
            </div>
        )
    }
}

Finder.defaultProps = {
    finder: []
}


