import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Spin, Breadcrumb, message, Icon, Tooltip, Modal } from 'antd';
import {
  DRIVE_FETCHING_PROJECTS,
  DRIVE_FETCHING_NOTES,
  DRIVE_BACK_ROOT,
  DRIVE_DOWNLOAD_NOTE,
  DRIVE_DELETE_ITEM,
} from '../../actions/drive';
import { getTokens } from '../../utils/db/app';

const confirm = Modal.confirm;

export default class Drive extends Component {
  static displayName = 'CloudDrive';
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    match: PropTypes.any.isRequired,
    drive: PropTypes.shape({
      status: PropTypes.number.isRequired,
      projects: PropTypes.array.isRequired,
      notes: PropTypes.array.isRequired,
      currentProjectName: PropTypes.string.isRequired,
    }).isRequired,
    note: PropTypes.shape({
      projectUuid: PropTypes.string.isRequired,
      projectName: PropTypes.string.isRequired,
      fileUuid: PropTypes.string.isRequired,
      fileName: PropTypes.string.isRequired,
    }).isRequired,
  }

  constructor() {
    super();
    this.state = {
      show: false,
      hasAuth: false,
      driveName: '',
      loadingText: 'Loading',
    };
  }

  componentDidMount() {
    this.checkOAuth();
  }

  getValidNotes = () => {
    const { notes } = this.props.drive;
    return notes.filter(note => /.md$/ig.test(note.name));
  }

  setAutuStatus = flag => this.setState({
    show: true,
    hasAuth: flag,
  });

  setDriveName = name => this.setState({
    driveName: name,
  });

  checkOAuth = () => {
    let drive = this.props.match.params.drive;
    const { dispatch, drive: { currentProjectName } } = this.props;
    const oAuth = getTokens();
    let auth;
    if (drive === 'onedrive') {
      drive = 'onedriver';
      auth = oAuth.oneDriver;
      this.setDriveName('One Drive');
    } else {
      message.error('Not support this cloud drive');
      return false;
    }
    if (auth.token && auth.refreshToken) { // 已经授权
      this.setAutuStatus(true);
      this.setState({
        loadingText: 'Loading...',
      });
      if (currentProjectName) {
        this.props.dispatch({
          type: DRIVE_FETCHING_NOTES,
          folder: currentProjectName,
          driveName: drive,
        });
      } else {
        dispatch({
          type: DRIVE_FETCHING_PROJECTS,
          driveName: drive,
        });
      }
    } else {
      this.setAutuStatus(false); // 未授权
    }
  }

  chooseProject = (folder) => {
    this.setState({
      loadingText: 'Loading...',
    });
    let driveName = this.props.match.params.drive;
    if (driveName === 'onedrive') {
      driveName = 'onedriver';
    }
    this.props.dispatch({
      type: DRIVE_FETCHING_NOTES,
      folder,
      driveName,
    });
  }

  backRoot = () => {
    this.props.dispatch({
      type: DRIVE_BACK_ROOT,
    });
  }

  // 下载单个笔记
  downloadNote = (name) => {
    const { drive: { currentProjectName }, note } = this.props;
    this.setState({
      loadingText: 'Downloading...',
    });
    let driveName = this.props.match.params.drive;
    if (driveName === 'onedrive') {
      driveName = 'onedriver';
    }
    let needUpdateEditor = false;
    if (note.projectUuid !== '-1' && note.fileUuid !== '-1' && note.projectName === currentProjectName && `${note.fileName}.md` === name) {
      needUpdateEditor = true;
    }
    this.props.dispatch({
      type: DRIVE_DOWNLOAD_NOTE,
      folder: currentProjectName,
      name,
      driveName,
      needUpdateEditor,
    });
  }

  // 打开删除笔记
  openDelete = (e, type, name, id, parentReference) => {
    e.stopPropagation();
    confirm({
      title: `Remove "${name.replace(/.md$/ig, '')}"?`,
      content: 'It can be reduced in the cloud drive.',
      onOk: () => {
        this.deleteItem(type, name, id, parentReference);
      },
    });
  }

  /**
   * @desc 删除单个Item
   * @param {String} type 'note' or 'project'
   */
  deleteItem = (type, name, id, parentReference) => {
    this.setState({
      loadingText: 'Deleting...',
    });
    let driveName = this.props.match.params.drive;
    if (driveName === 'onedrive') {
      driveName = 'onedriver';
    }
    let jsonItemId;
    if (type === 'note') {
      // 搜索匹配.json文件
      const { notes } = this.props.drive;
      const jsonName = `${name.replace(/.md$/ig, '')}.json`;
      const nl = notes.length;
      for (let i = 0; i < nl; i++) {
        if (notes[i].name === jsonName) {
          jsonItemId = notes[i].id;
          break;
        }
      }
    }
    this.props.dispatch({
      type: DRIVE_DELETE_ITEM,
      itemId: id,
      parentReference,
      driveName,
      jsonItemId,
      deleteType: type,
    });
  }

  renderBread = (type, blur, driveName, currentProjectName) => {
    if (type === 'notes') {
      return (
        <div className={`bread-bar ${blur}`}>
          <div className="bread-container">
            <Breadcrumb>
              <Breadcrumb.Item>{driveName}</Breadcrumb.Item>
              <Breadcrumb.Item
                className="cursor-pointer"
                onClick={this.backRoot}
              >
                Yosoro
              </Breadcrumb.Item>
              <Breadcrumb.Item>{currentProjectName}</Breadcrumb.Item>
            </Breadcrumb>
            <div className="tools">
              <Icon type="reload" onClick={this.checkOAuth} />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className={`bread-bar ${blur}`}>
        <div className="bread-container">
          <Breadcrumb>
            <Breadcrumb.Item>{driveName}</Breadcrumb.Item>
            <Breadcrumb.Item>Yosoro</Breadcrumb.Item>
          </Breadcrumb>
          <div className="tools">
            <Icon type="reload" onClick={this.checkOAuth} />
          </div>
        </div>
      </div>
    );
  };

  renderLoading = (status) => {
    const { loadingText } = this.state;
    if (status === 0) {
      return (
        <div className="loading">
          <Spin size="large" tip={loadingText} />
        </div>
      );
    }
    return null;
  }

  /**
   * @param {Number} status 请求状态
   * @param {String} driveName 驱动名称
   * @param {String} currentProjectName
   * @param {String} blur
   */
  renderNotes = (status, driveName, currentProjectName, blur) => {
    const notes = this.getValidNotes();
    const noteHtml = '<use class="trash-notebook-use" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#icon_svg_note" />';
    return (
      <Fragment>
        {this.renderLoading(status)}
        {this.renderBread('notes', blur, driveName, currentProjectName)}
        {status === 2 ? (
          <div className={`content ${blur}`}>
            <p className="tips">
              <Icon type="reload" onClick={this.checkOAuth} />
              Fetch data failed.
            </p>
          </div>
        ) : (
          <div className={`content ${blur}`} id="app_cloud">
            {notes.length === 0 ? (
              <p className="tips">List is empty.</p>
            ) : (
              <ul className="list">
                {notes.map((item) => {
                  const { name, id } = item;
                  let showName = '';
                  if (!/.md$/ig.test(name)) {
                    return null;
                  }
                  showName = name.replace(/.md$/ig, '');
                  return (
                    <li
                      className="list-item"
                      key={id}
                    >
                      <div className="list-item__img">
                        <svg className="menu-svg" viewBox="0 0 59 59" dangerouslySetInnerHTML={{ __html: noteHtml }} />
                      </div>
                      <h3 className="list-item__title">{showName}</h3>
                      <div className="list-item__option">
                        <span
                          className="list-item__options__item"
                          onClick={() => this.downloadNote(name)}
                        >
                          <Tooltip
                            placement="bottom"
                            title="download"
                            getPopupContainer={() => document.getElementById('app_cloud')}
                          >
                            <Icon type="download" />
                          </Tooltip>
                        </span>
                        <span
                          className="list-item__options__item"
                          onClick={e => this.openDelete(e, 'note', name, id, item.parentReference)}
                        >
                          <Tooltip placement="bottom" title="delete note">
                            <Icon type="delete" />
                          </Tooltip>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </Fragment>
    );
  }

  renderProject = (status, driveName, currentProjectName, blur) => {
    const { projects } = this.props.drive;
    const notebookHtml = '<use class="trash-notebook-use" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#icon_svg_notebook" />';
    return (
      <Fragment>
        {this.renderLoading(status)}
        {this.renderBread('projects', blur, driveName, currentProjectName)}
        {status === 2 ? (
          <div className={`content ${blur}`} id="app_cloud">
            <p className="tips">
              <Icon type="reload" onClick={this.checkOAuth} />
              Fetch data failed.
            </p>
          </div>
        ) : (
          <div className={`content ${blur}`}>
            {projects.length === 0 ? (
              <p className="tips">List is empty.</p>
            ) : (
              <ul className="list">
                {projects.map((item) => {
                  if (typeof item.folder === 'undefined') {
                    return null;
                  }
                  return (
                    <li
                      className="list-item"
                      key={item.id}
                      onClick={() => this.chooseProject(item.name)}
                      role="presentation"
                    >
                      <div className="list-item__img">
                        <svg className="menu-svg" viewBox="0 0 59 59" dangerouslySetInnerHTML={{ __html: notebookHtml }} />
                      </div>
                      <h3 className="list-item__title">{item.name}</h3>
                      <div className="list-item__option">
                        <span
                          className="list-item__options__item"
                          onClick={e => this.openDelete(e, 'project', name, item.id, item.parentReference)}
                        >
                          <Tooltip placement="bottom" title="delete notebook">
                            <Icon type="delete" />
                          </Tooltip>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </Fragment>
    );
  }

  render() {
    const { show, hasAuth, driveName } = this.state;
    if (!show) {
      return null;
    }
    if (!hasAuth) {
      return (
        <div className="content">
          <p className="tips">
            <Icon type="reload" onClick={this.checkOAuth} />
            Yosoro need to be authorized.
          </p>
        </div>
      );
    }
    const { drive: { status, currentProjectName } } = this.props;
    let blur = '';
    if (status === 0) {
      blur = 'blur';
    }
    if (currentProjectName) {
      return this.renderNotes(status, driveName, currentProjectName, blur);
    }
    return this.renderProject(status, driveName, currentProjectName, blur);
  }
}
