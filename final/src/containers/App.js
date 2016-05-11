import React from 'react';
import map from 'lodash/map';
import remove from 'lodash/remove';
import 'whatwg-fetch';

import EmailForm from '../components/EmailForm';
import EmailList from '../components/EmailList';
import EmailView from '../components/EmailView';

export default class App extends React.Component {
    static propTypes = {
        pollInterval: React.PropTypes.number
    }

    static defaultProps = {
        pollInterval: 2000
    }

    state = {
        emails: [],
        selectedEmailId: -1
    }

    componentDidMount() {
        this._getUpdateEmails();

        this._pollId = setInterval(
            () => this._getUpdateEmails(),
            this.props.pollInterval
        );
    }

    componentWillUnmount() {
        // Need to remember to clearInterval when the component gets
        // removed from the DOM, otherwise the interval will keep going
        // forever and leak memory
        clearInterval(this._pollId);
    }

    _getUpdateEmails() {
        return fetch('/api/emails')
            .then((res) => res.json())
            .then((emails) => this.setState({emails}))
            .catch((ex) => console.error(ex));
    }

    _handleItemSelect(selectedEmailId) {
        if (this.state.selectedEmailId !== selectedEmailId) {
            // update state (so that the EmailView will show)
            this.setState({selectedEmailId});

            // also mark the email as read
            fetch(`/api/emails/${selectedEmailId}`, {
                method: 'PUT',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    unread: false
                })
            })
                .then((res) => res.json())
                .then(({success}) => {
                    if (success) {
                        // optimistic updating (see _handleFormSubmit for more info)
                        this.setState({
                            emails: map(this.state.emails, (emailInfo) => (
                                emailInfo === selectedEmailId
                                    ? {...emailInfo, unread: false}
                                    : emailInfo
                            ))
                        });

                        // on success retrieve new emails
                        this._getUpdateEmails();
                    }
                    else {
                        throw new Error(`Unable to mark email ID #${selectedEmailId} as read.`);
                    }
                })
                .catch((ex) => console.error(ex));
        }
    }

    _handleItemDelete(emailIdToDelete) {
        fetch(`/api/emails/${emailIdToDelete}`, {
            method: 'DELETE'
        })
            .then((res) => res.json())
            .then(({success}) => {
                if (success) {
                    // optimistic updating (see _handleFormSubmit for more info)
                    this.setState({
                        emails: remove(this.state.emails, (emailInfo) => emailInfo.id === emailIdToDelete)
                    });

                    // on success retrieve new emails
                    this._getUpdateEmails();
                }
                else {
                    throw new Error(`Unable to delete email ID ${emailIdToDelete}.`);
                }
            })
            .catch((ex) => console.error(ex));
    }

    _handleItemMarkUnread(emailId) {
        fetch(`/api/emails/${emailId}`, {
            method: 'PUT',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                unread: true
            })
        })
            .then((res) => res.json())
            .then(({success}) => {
                if (success) {
                    // optimistic updating (see _handleFormSubmit for more info)
                    this.setState({
                        emails: map(this.state.emails, (emailInfo) => (
                            emailInfo === emailId
                                ? {...emailInfo, unread: true}
                                : emailInfo
                        ))
                    });

                    // on success retrieve new emails
                    this._getUpdateEmails();
                }
                else {
                    throw new Error(`Unable to mark email ID ${emailId} unread.`);
                }
            })
            .catch((ex) => console.error(ex));
    }

    _handleEmailViewClose() {
        // We close the email view by resetting the selected email
        this.setState({
            selectedEmailId: -1
        });
    }

    _handleFormSubmit(newEmail) {
        // Make a JSON POST with the new email
        fetch('/api/emails', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newEmail)
        })
            .then((res) => res.json())
            .then(({success}) => {
                if (success) {
                    // if the email was successfully updated, we have to make
                    // a request to get the new list of emails, but we'll have
                    // to wait for the response of that request, so let's add to
                    // our state immediately and then later when the response
                    // comes back, the server-side list will update. This is mainly
                    // here to demonstrate immutable updating of data structures
                    this.setState({
                        emails: [
                            ...this.state.emails,
                            {
                                ...newEmail,
                                id: Date.now(),
                                date: `${new Date()}`,
                                unread: true
                            }
                        ]
                    });

                    // on success retrieve new emails
                    this._getUpdateEmails();
                }
                else {
                    throw new Error('Unable to send email!');
                }
            })
            .catch((ex) => console.error(ex));
    }

    render() {
        let {emails, selectedEmailId} = this.state;
        let selectedEmail = emails.find((email) => email.id === selectedEmailId);
        let emailView;

        if (selectedEmail) {
            emailView = (
                <EmailView email={selectedEmail}
                    onClose={this._handleEmailViewClose.bind(this)}
                />
            );
        }

        return (
            <div>
                <EmailList emails={emails}
                    selectedEmailId={selectedEmailId}
                    onItemSelect={this._handleItemSelect.bind(this)}
                    onItemDelete={this._handleItemDelete.bind(this)}
                    onItemMarkUnread={this._handleItemMarkUnread.bind(this)}
                />
                {emailView}
                <EmailForm onSubmit={this._handleFormSubmit.bind(this)} />
            </div>
        );
    }
}
