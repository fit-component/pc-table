import React from 'react'
import ReactDOM from 'react-dom'
import classNames from 'classnames'
import {Pagination, PaginationFull} from 'fit-pagination'
import Checkbox from 'fit-checkbox'
import Radio from 'fit-radio'
import Input from 'fit-input'
import Button from 'fit-button'
import Finder from './finder'
import Add from './add'
import Modal from 'fit-modal'
import RenderTo from 'fit-render-to'
import $ from 'jquery'
import _ from 'lodash'
import './index.scss'

// 判断当前行是否在选择的行信息里
const inRowList = (info, index, list)=> {
    for (let val of list) {
        if (index === val.index && _.isEqual(info, val.info)) {
            return true
        }
    }
    return false
}

// props预处理
const handlePropsAddon = (props)=> {
    // 是否添加表头
    if (props.selector.type === 'checkbox' && props.fields[0].type !== 'checkbox') {
        props.fields.unshift({
            type: 'checkbox'
        })
    }
    if (props.selector.type === 'radio' && props.fields[0].type !== 'radio') {
        props.fields.unshift({
            type: 'radio'
        })
    }
    return props
}

export default class Table extends React.Component {
    constructor(props) {
        super(props)

        handlePropsAddon(this.props)

        this.state = {
            datas      : [],
            paginOpts  : {},
            currentPage: 1,
            loading    : false,
            fields     : _.cloneDeep(this.props.fields),
            info       : {
                message: '',
                type   : ''
            },

            // 当前排序的key
            sortKey: '',

            // 当前排序状态 （不排序,正序,倒序）
            sortStatu: null,

            // 行选择模式下选择的行信息
            selectRowList: [],

            // 当前显示input框的位置
            showInputPosition: {
                x: -1,
                y: -1
            },

            // 编辑框内容
            editValue: null,

            // 删除框是否显示
            showDeleteModal: false,

            // 是否显示列删除按钮(即使设置了删除功能)
            showColDeleteButton: true
        }

        // dom任意位置点击
        this.handleDocumentClick = (event)=> {
            if ($(this.dom).find('#edit-input').length === 0)return
            if (!$.contains($(this.dom).find('#edit-input')[0], event.target)) {
                this.setState({
                    showInputPosition: {
                        x: -1,
                        y: -1
                    },
                    editValue        : null
                })
            }
        }
    }

    componentWillReceiveProps(nextProps) {
        if (this.props === nextProps)return

        let newState = {}
        let newProps = _.cloneDeep(nextProps)

        handlePropsAddon(newProps)

        if ('datas' in nextProps && this.props.get.url === '') {
            newState.datas = newProps.datas
        }

        newState.fields = _.cloneDeep(newProps.fields)
        this.setState(newState)
    }

    componentWillMount() {
        // 查询请求参数
        this.searchOpts = {}

        // 人工填写的查询参数
        this._searchParams = {}

        // 上一个请求返回的内容
        this.prevResponse = null

        // extend获取内容
        this.extendInfo = {
            // 获取全部列信息
            getAllRows: ()=> {
                return _.cloneDeep(this.state.datas)
            },

            // 获取当前选择的列信息
            getCurrentSelectRows: ()=> {
                let selectList = []
                this.state.selectRowList.map((item)=> {
                    selectList.push(item.info)
                })
                return _.cloneDeep(selectList)
            },

            // 获取未选择列的信息
            getCurrentNotSelectRows: ()=> {
                let datas = _.cloneDeep(this.state.datas)
                return _.remove(datas, (item, index)=> {
                    return !this.state.selectRowList.some(el=>el.index === index)
                })
            },

            getData: () => {
                return _.cloneDeep(this.state.datas)
            },

            mockDeleteData: (deleteList) => {
                let datas = _.cloneDeep(this.state.datas)

                datas = _.filter(datas, (val) => {
                    return _.filter(deleteList, (del) => {
                            return !_.isEqual(val, del)
                        }).length === deleteList.length
                })

                this.setState({
                    datas        : datas,
                    selectRowList: []
                })
            },

            currentPage: ()=> {
                return this.state.currentPage
            },

            jump: (page)=> {
                this.updateTable(page)
            },

            info: (message, type)=> {
                this.info(setColDeleteButtonVisiblemessage, type)
            },

            setColDeleteButtonVisible: (isShow)=> {
                this.setState({
                    showColDeleteButton: isShow
                })
            }
        }
    }

    componentDidMount() {
        this.dom = ReactDOM.findDOMNode(this)
        $(document).on('click', this.handleDocumentClick)
        this.updateTable()
    }

    componentWillUnmount() {
        $(document).off('click', this.handleDocumentClick)
        if (this.infoSetTimeout) {
            clearTimeout(this.infoSetTimeout)
        }
    }

    // 提示信息
    info(message, type) {
        this.setState({
            info: {
                message: message,
                type   : type
            }
        }, ()=> {
            if (this.infoSetTimeout) {
                clearTimeout(this.infoSetTimeout)
            }
            this.infoSetTimeout = setTimeout(()=> {
                this.setState({
                    info: {
                        message: '',
                        type   : ''
                    }
                })
            }, 2000)
        })
    }

    // 刷新数据表
    updateTable(page) {
        if (page) {
            this.searchOpts.page = page
        }

        let mergedSearchOpts = Object.assign({}, this.searchOpts, this._searchParams)

        if (this.props.get.url === '') {
            this.setState({
                datas: this.props.datas
            })
        } else {
            const postData = this.props.get.beforeSend(mergedSearchOpts, page || this.state.currentPage, this.prevResponse, this.extendInfo)

            $.ajax({
                url       : this.props.get.url,
                method    : this.props.get.method,
                dataType  : this.props.get.dataType || 'json',
                beforeSend: ()=> {
                    this.setState({
                        loading: true
                    })
                },
                data      : postData
            }).done((res)=> {
                if (typeof res === 'string') {
                    res = JSON.parse(res)
                }

                // 保存当前返回值
                this.prevResponse = res

                let newPaginOpts = this.state.paginOpts
                let newDatas = this.props.get.success(res, newPaginOpts, this.extendInfo)

                // 手动调用翻页组件
                this.refs.pagination && this.refs.pagination.jump(page || this.state.currentPage)

                this.setState({
                    datas        : newDatas,
                    paginOpts    : newPaginOpts,
                    currentPage  : page || this.state.currentPage,
                    loading      : false,
                    selectRowList: []
                }, ()=> {
                    this.props.onTableUpdate(newDatas, postData)
                })
            })
        }
    }

    // 翻页
    handleChangePage(page) {
        this.updateTable(page)
    }

    // radio行选择点击
    onTrRadioClick(info, index) {
        this.setState({
            selectRowList: [{
                info : info,
                index: index
            }]
        })
    }

    // checkbox行选择点击
    onTrCheckboxClick(info, index, checked) {
        console.log(info,index,checked)
        let newSelectRowList = _.cloneDeep(this.state.selectRowList)

        if (checked) {
            newSelectRowList.push({
                info : info,
                index: index
            })
        } else {
            _.remove(newSelectRowList, function (item) {
                if (item.index === index && _.isEqual(item.info, info)) {
                    return true
                }
                return false
            })
        }

        this.setState({
            selectRowList: newSelectRowList
        })
    }

    // checkbox行全选
    onTrCheckboxSelectAll(checked) {
        if (checked) {
            let newSelectRowList = []
            this.state.datas.map((item, index)=> {
                newSelectRowList.push({
                    info : item,
                    index: index
                })
            })
            this.setState({
                selectRowList: newSelectRowList
            })
        } else {
            this.setState({
                selectRowList: []
            })
        }
    }

    // 查询按钮点击
    handleSearch(params) {
        this._searchParams = params
        this.updateTable(1)
    }

    // 点击删除按钮
    handleDelete(colInfo) {
        this.setState({
            showDeleteModal: true
        })
        this.currentDeleteColInfo = colInfo
    }

    // 添加
    handleAdd(params, callback) {
        $.ajax({
            url     : this.props.add.url,
            method  : this.props.add.method,
            data    : this.props.add.beforeSend(params),
            dataType: this.props.get.dataType || 'json'
        }).done((res)=> {
            if (typeof res === 'string') {
                res = JSON.parse(res)
            }

            let info = this.props.add.success(res)
            callback(info)

            if (info.ok) {
                this.updateTable()
            }
        })
    }

    handleSortChange(key, isSort) {
        if (!isSort)return

        let sortStatu = null

        if (key === this.state.sortKey) {
            switch (this.state.sortStatu) {
            case null:
                sortStatu = 'asc'
                break
            case 'asc':
                sortStatu = 'desc'
                break
            case 'desc':
                sortStatu = null
                break
            }
        } else {
            sortStatu = 'asc'
        }

        this.setState({
            sortKey  : key,
            sortStatu: sortStatu
        }, ()=> {
            let searchParam = this.props.onSort(key, this.state.sortStatu)
            this.searchOpts = $.extend(this.searchOpts, searchParam)
            this.updateTable(1)
        })
    }

    // 双击某一个条目
    handleTdDoubleClick(index, elIndex) {
        this.setState({
            showInputPosition: {
                x: index,
                y: elIndex
            }
        }, ()=> {
            $(this.dom).find('#edit-input input').focus()
        })
    }

    // 修改编辑框内容
    handleChangeEditValue(value) {
        this.setState({
            editValue: value
        })
    }

    // 编辑点击保存按钮
    handleEditSave(rowInfo, key) {
        $.ajax({
            url     : this.props.edit.url,
            method  : this.props.edit.method,
            data    : this.props.edit.beforeSend(rowInfo, key, this.state.editValue),
            dataType: this.props.get.dataType || 'json'
        }).done((res)=> {
            if (typeof res === 'string') {
                res = JSON.parse(res)
            }

            let info = this.props.edit.success(res)

            if (info.ok) {
                this.setState({
                    showInputPosition: {
                        x: -1,
                        y: -1
                    },
                    editValue        : null
                }, ()=> {
                    // 刷新当前页
                    this.updateTable()
                })
            } else {
                this.info(info.message, 'danger')
            }
        })
    }

    handleDeleteModalOk() {
        $.ajax({
            url       : this.props.del.url,
            method    : this.props.del.method,
            dataType  : this.props.get.dataType || 'json',
            beforeSend: ()=> {
                this.setState({
                    loading: true
                })
            },
            data      : this.props.del.beforeSend(this.currentDeleteColInfo)
        }).done((res)=> {
            if (typeof res === 'string') {
                res = JSON.parse(res)
            }

            let info = this.props.del.success(res)

            this.setState({
                loading: false
            })

            // 如果删除失败,提示错误
            if (!info.ok) {
                return this.info(info.message, 'danger')
            }

            // 删除成功,如果当前页剩余条目只有一个,且不是第一页,刷新到上一页,否则刷新当前页面
            if (this.state.datas.length <= 1 && this.state.currentPage > 1) {
                this.updateTable(this.state.currentPage - 1)
            } else {
                this.updateTable()
            }

            // 隐藏确认删除模态框
            this.setState({
                showDeleteModal: false
            })
        })
    }

    handleDeleteModalCancel() {
        this.setState({
            showDeleteModal: false
        })
    }

    render() {
        const {className, responsive, del, title, add, fields, finder, finderSelector, extend, ...others} = this.props
        const classes = classNames({
            '_namespace': true,
            [className] : className
        })

        let Th = this.state.fields.map((item, index)=> {
            switch (item.type) {
            case 'checkbox':
                return (
                    <th key={index}>
                        <Checkbox onChange={this.onTrCheckboxSelectAll.bind(this)}
                                  checked={this.state.datas.length===this.state.selectRowList.length}>全选</Checkbox>
                    </th>
                )
            case 'radio':
                return (
                    <th key={index}></th>
                )
            default:
                let arrowClass = classNames({
                    'sort-can-use': item.sort && (this.state.sortKey !== item.key || this.state.sortStatu === null),
                    'fa'          : item.sort,
                    'fa-sort'     : item.sort && (this.state.sortKey !== item.key || this.state.sortStatu === null),
                    'fa-sort-asc' : item.sort && this.state.sortKey === item.key && this.state.sortStatu === 'asc',
                    'fa-sort-desc': item.sort && this.state.sortKey === item.key && this.state.sortStatu === 'desc'
                })

                let Arrow = (
                    <i className={arrowClass}/>
                )

                let thClass = classNames({
                    'table-th': true,
                    'sortable': item.sort
                })

                return (
                    <th key={index}
                        className={thClass}
                        onClick={this.handleSortChange.bind(this,item.key,item.sort)}>
                        {item.value}
                        {item.sort ? Arrow : null}
                    </th>
                )
            }
        })

        // 如果有删除功能,右侧新增一列
        if (del.url !== '' && this.state.showColDeleteButton) {
            Th.push(
                <th key="delete"></th>
            )
        }

        let TrTd = this.state.datas.map((tr, index)=> {
            let Td = this.state.fields.map((field, fieldIndex)=> {
                if (typeof field.render === 'function') {
                    return (
                        <td key={fieldIndex}>
                            {field.render(tr, this.extendInfo)}
                        </td>
                    )
                }

                switch (field.type) {
                case 'checkbox':
                    return (
                        <td key={fieldIndex}>
                            <Checkbox onChange={this.onTrCheckboxClick.bind(this,tr,index)}
                                      checked={inRowList(tr,index,this.state.selectRowList)}/>
                        </td>
                    )
                case 'radio':
                    return (
                        <td key={fieldIndex}>
                            <Radio onChange={this.onTrRadioClick.bind(this,tr,index)}
                                   checked={inRowList(tr,index,this.state.selectRowList)}/>
                        </td>
                    )
                default:
                    if (field.edit) {
                        if (index === this.state.showInputPosition.x && fieldIndex === this.state.showInputPosition.y) {
                            return (
                                <td key={fieldIndex}
                                    style={{padding:0,border:'none'}}
                                    id="edit-input">
                                    <div style={{display:'flex'}}>
                                        <Input value={this.state.editValue||tr[field.key]}
                                               onChange={this.handleChangeEditValue.bind(this)}/>
                                        <Button type="success"
                                                style={{borderRadius:0,marginLeft:-1}}
                                                onClick={this.handleEditSave.bind(this,tr,field.key)}>
                                            <i className="fa fa-check"></i>
                                        </Button>
                                    </div>
                                </td>
                            )
                        }

                        return (
                            <td key={fieldIndex}
                                onDoubleClick={this.handleTdDoubleClick.bind(this,index,fieldIndex)}>
                                {tr[field.key]}
                            </td>
                        )
                    }
                    return (
                        <td key={fieldIndex}>
                            {tr[field.key]}
                        </td>
                    )
                }
            })

            // 如果有删除功能,右侧新增一列
            if (del.url !== '' && this.state.showColDeleteButton) {
                Td.push(
                    <td style={{padding:0}}
                        className="remove"
                        key="delete"
                        onClick={this.handleDelete.bind(this,tr)}>
                        <i className="fa fa-trash"></i>
                    </td>
                )
            }

            return (
                <tr key={index}>
                    {Td}
                </tr>
            )
        })

        let infoClass = classNames({
            'pull-right'          : true,
            [this.state.info.type]: this.state.info.type !== ''
        })

        let Table = (
            <table className="table table-striped">
                <thead>
                <tr>
                    {Th}
                </tr>
                </thead>
                <tbody>
                {_.isEmpty(this.state.datas) ?
                    <tr>
                        <td colSpan={this.state.fields.length}>
                            <span className="empty-content">暂时没有数据~</span>
                        </td>
                    </tr> : TrTd}
                </tbody>
            </table>
        )

        if (responsive) {
            Table = (
                <div className="table-responsive">{Table}</div>
            )
        }

        return (
            <div className={classes}>
                <div className="panel">
                    <div className="panel-heading">
                        {title}
                        {add.url === '' ? null :
                            <Add fields={fields}
                                 opts={add}
                                 onAdd={this.handleAdd.bind(this)}/>
                        }
                        <span className={infoClass}
                              style={{marginLeft:10}}>{this.state.info.message}</span>
                    </div>

                    {_.isEmpty(finder) ? null :
                        finderSelector ? <RenderTo selector={finderSelector}>
                            <Finder onSearch={this.handleSearch.bind(this)}
                                    finder={finder}/>
                        </RenderTo> :
                            <Finder onSearch={this.handleSearch.bind(this)}
                                    finder={finder}/> }

                    {Table}

                    {_.isEmpty(this.state.paginOpts) && _.isEmpty(extend()) ? null :
                        <div className="pagination-container">
                            <div
                                style={{flexGrow:1,paddingLeft:15}}>{extend(this.extendInfo)}</div>
                            {_.isEmpty(this.state.paginOpts) ? null :
                                this.state.paginOpts.allPage > 1 ?
                                    <PaginationFull style={{flexGrow:1}}
                                                    ref="pagination"
                                                    onChange={this.handleChangePage.bind(this)}
                                        {...this.state.paginOpts}
                                                    loading={this.state.loading}/>
                                    :
                                    <Pagination style={{flexGrow:1}}
                                                ref="pagination"
                                                onChange={this.handleChangePage.bind(this)}
                                        {...this.state.paginOpts}
                                                loading={this.state.loading}/>
                            }
                        </div>
                    }
                </div>

                <Modal show={this.state.showDeleteModal}
                       onOk={this.handleDeleteModalOk.bind(this)}
                       onCancel={this.handleDeleteModalCancel.bind(this)}>
                    <div>{del.alert(this.currentDeleteColInfo || {})}</div>
                </Modal>
            </div>
        )
    }
}

Table.defaultProps = {
    // @desc 表格标题
    title: '表格',

    // @desc 表头字段
    fields: [],

    // @desc 打底数据
    datas: [],

    // @desc 新增
    add: {
        url       : '',
        method    : 'get',
        dataType  : 'json',
        beforeSend: (info)=> {
            return info
        },
        success   : (res)=> {
            return res.errno === 0
        }
    },

    // @desc 删除
    del: {
        url       : '',
        method    : 'get',
        dataType  : 'json',
        alert     : ()=> {
            return (
                <div>确认删除吗?</div>
            )
        },
        beforeSend: (info)=> {
            return info
        },
        success   : (res)=> {
            return res.errno === 0
        }
    },

    // @desc 修改
    update: {
        url       : '',
        method    : 'get',
        dataType  : 'json',
        beforeSend: (info)=> {
            return info
        },
        success   : (res)=> {
            return res.errno === 0
        }
    },

    // @desc 获取数据
    get: {
        url       : '',
        method    : 'get',
        dataType  : 'json',
        beforeSend: (info)=> {
            return info
        },
        success   : (res)=> {
            return res.data
        }
    },

    // @desc 开启何种列选择
    // @enum radio checkbox
    selector: '',

    // @desc 条件查询
    finder: {},

    // @desc 左下角自定义拓展
    extend: (table)=> {
    },

    // @desc 排序回调
    onSort: (key)=> {
    },

    // @desc 编辑回调
    onEdit: ()=> {
    },

    // @desc 表格数据更新的回调
    onTableUpdate: ()=> {
    },

    // @desc 开启响应式表格,内容过多时出现横向滚动条
    responsive: false,

    // @desc 通过指定选择器, 渲染finder组件到指定dom下
    finderSelector: null
}