document.addEventListener('DOMContentLoaded', function () {
    let platformClient = window.require('platformClient');
    updateProgressBar(20);

    /*
    * Le SDK des applications clientes peut interpoler l'environnement PC actuel dans l'URL de votre application
    * EX: https://mypurecloud.github.io/client-app-sdk/profile.html?pcEnvironment={{pcEnvironment}}
    *
    * Lecture de l'environnement PC à partir de la chaîne de requête ou du paramètre d'état renvoyé par la réponse OAuth2
    */
    let pcEnvironment = getEmbeddingPCEnv();
    if (!pcEnvironment) {
        setErrorState(
            "Cannot identify App Embeddding context.  Did you forget to add pcEnvironment={{pcEnvironment}} to your app's query string?"
        );
        return;
    }
    updateProgressBar(40);

    /*
    * Remarque: Pour utiliser cette application dans votre propre organisation, vous devrez créer vos propres clients OAuth2
    * dans votre organisation PureCloud. Après avoir créé le client d'octroi implicite, mappez les identifiants client sur
    * la ou les clés de région spécifiées dans l'objet ci-dessous, déployez la page et configurez une application pour pointer vers cette URL.
    */
    let pcOAuthClientIds = { 'mypurecloud.de': 'd3d0641c-359c-4deb-8723-703f49075de9:_zOFyAjpAnMVDGE3L0j4tlE-pSEvjbc7K7iGSl0xCCg' };
    let clientId = pcOAuthClientIds[pcEnvironment];
    if (!clientId) {
        setErrorState(
            pcEnvironment + ': Unknown/Unsupported PureCloud Environment'
        );
        return;
    }
    updateProgressBar(60);

    let client = platformClient.ApiClient.instance;
    client.setEnvironment(pcEnvironment);

    let clientApp = null;
    try {
        clientApp = new window.purecloud.apps.ClientApp({
            pcEnvironment: pcEnvironment
        });
    } catch (e) {
        setErrorState(
            pcEnvironment + ': Unknown/Unsupported PureCloud Embed Context'
        );
        return;
    }
    updateProgressBar(80);

    /*
    * Configurer le testeur manuel maintenant; aucune autorisation PC requise
    *
    * Cette interface utilisateur est utilisée à des fins de test pour naviguer manuellement vers un contact externe par ID.
    * Il ignore délibérément le fait qu'un utilisateur ne peut pas être autorisé à afficher les contacts externes.
    */
    document
        .querySelector('.manual-example #contactButton')
        .addEventListener('click', function () {
            let contactId = document.querySelector('#contact-id').value.trim();
            if (contactId) {
                clientApp.externalContacts.showExternalContactProfile(contactId);
            }
        });
    document
        .querySelector('.manual-example #orgButton')
        .addEventListener('click', function () {
            let externalOrganizationId = document.querySelector('#org-id').value.trim();
            if (externalOrganizationId) {
                clientApp.externalContacts.showExternalOrganizationProfile(externalOrganizationId);
            }
        });

    let redirectUrl = window.location.origin;
    if (!redirectUrl) {
        redirectUrl = window.location.protocol + '//' + window.location.host;
    }
    redirectUrl += window.location.pathname;

    // Authenticate with PureCloud
    let authenticated = false;
    let userDataAcquired = false;

    client
        .loginImplicitGrant(clientId, redirectUrl, {
            state: 'pcEnvironment=' + pcEnvironment
        })
        .then(function () {
            updateProgressBar(100);
            authenticated = true;
            return new platformClient.UsersApi().getUsersMe({
                expand: ['authorization']
            });
        })
        .then(function (profileData) {
            userDataAcquired = true;
            // Vérifiez si l'utilisateur actuel pourra voir les contacts externes
            let permissions = profileData.authorization.permissions;
            if (checkPermission(permissions, 'externalContacts:contact:view')) {
                requestExternalContacts().then(data => {
                    // Masquer la barre de progression une fois l'authentification terminée et la promesse résolue
                    let authenticatingEl = document.querySelector('.authenticating');
                    authenticatingEl.classList.add('hidden');
                    let entities = data.entities;
                    // Créer une table avec les données de l'appel API
                    for (let i = 0; i < entities.length; i++) {
                        let hasOrg = !!entities[i].externalOrganization;
                        document.getElementById('tableBody').insertAdjacentHTML('beforeend',
                            `<tr>
                                <td>
                                    <a id="entity-${i}"></a>
                                </td>
                                <td>
                                    <a id="org-${i}"></a>
                                </td>
                            </tr>`
                        );
                        // Attacher des écouteurs à des entités pour appeler des méthodes sdk
                        let entity = document.getElementById(`entity-${i}`);
                        entity.addEventListener('click', function () {
                            clientApp.externalContacts.showExternalContactProfile(entities[i].id);
                        });
                        entity.appendChild(document.createTextNode(`${entities[i].lastName}, ${entities[i].firstName}`));
                        if (hasOrg) {
                            let org = document.getElementById(`org-${i}`);
                            let orgId = entities[i].externalOrganization.id;
                            org.addEventListener('click', function () {
                                clientApp.externalContacts.showExternalOrganizationProfile(orgId);
                            });
                            org.appendChild(document.createTextNode(orgId));
                        }
                    }
                }).catch(err => {
                    setErrorState(err);
                });
            } else {
                setErrorState('You do not have the proper permissions to view external contacts.');
            }
        })
        .catch(function () {
            if (!authenticated) {
                setErrorState('Failed to Authenticate with PureCloud');
            } else if (!userDataAcquired) {
                setErrorState('Failed to locate user in PureCloud');
            }
        });

    function setErrorState(errorMsg) {
        // Afficher le texte d'erreur dans la barre de progression
        document.querySelector('.progress-label').innerText = errorMsg;
        document.querySelector('.progress-bar').className += ' progress-bar-danger';
        updateProgressBar(100);
    }

    /**
     * Analysez le tableau des autorisations et vérifiez si elles correspondent ou non à celles requises spécifiées.
     *
     * @returns Un booléen indiquant si l'utilisateur possède les autorisations requises.
     */
    function checkPermission(permissions, permissionValue) {
        let isAllowed = false;

        if (!permissions) {
            permissions = [];
        }

        if (permissionValue.match(/^[a-zA-Z0-9]+:\*$/)) {
            permissionValue = permissionValue.replace('*', '*:*');
        }

        const permissionsToValidate = permissionValue.split(':');
        const targetDomain = permissionsToValidate[0];
        const targetEntity = permissionsToValidate[1];
        const targetAction = permissionsToValidate[2];

        permissions.forEach(function (permission) {
            const permissions = permission.split(':');
            const domain = permissions[0];
            const entity = permissions[1];
            const actionSet = permissions[2];

            if (targetDomain === domain) {
                const matchesEntity = isPermission(targetEntity, entity);
                const matchesAction = isPermission(targetAction, actionSet);

                if (matchesEntity && matchesAction) {
                    isAllowed = true;
                }
            }
        });

        return isAllowed;
    }

    function isPermission(item, targetItem) {
        let isItem = item === '*' || targetItem === '*';
        if (!isItem) {
            isItem = item === targetItem;
        }
        return isItem;
    }

    /*
     * Déterminez l'environnement PureCloud d'incorporation basé sur la chaîne de requête ou
     * renvoyé via le paramètre de hachage d'état d'octroi implicite OAuth2.
     *
     * @returns Une chaîne indiquant l'env PC d'intégration (par exemple mypurecloud.com, mypurecloud.jp); sinon, null.
     */
    function getEmbeddingPCEnv() {
        let result = null;

        if (window.location.hash && window.location.hash.indexOf('access_token') >= 0) {
            let oauthParams = extractParams(window.location.hash.substring(1));
            if (oauthParams && oauthParams.access_token && oauthParams.state) {
                // OAuth2 spec dicte cet encodage
                // Voir: https://tools.ietf.org/html/rfc6749#appendix-B
                let stateSearch = unescape(oauthParams.state);
                // result = extractParams(stateSearch).pcEnvironment;
            }
        }

        if (!result && window.location.search) {
            result = extractParams(window.location.search.substring(1)).pcEnvironment || null;
        }

        return result;
    }

    function extractParams(paramStr) {
        let result = {};

        if (paramStr) {
            let params = paramStr.split('&');
            params.forEach(function (currParam) {
                if (currParam) {
                    let paramTokens = currParam.split('=');
                    let paramName = paramTokens[0];
                    let paramValue = paramTokens[1];
                    if (paramName) {
                        paramName = decodeURIComponent(paramName);
                        paramValue = paramValue ? decodeURIComponent(paramValue) : null;

                        if (!result.hasOwnProperty(paramName)) {
                            result[paramName] = paramValue;
                        } else if (Array.isArray(result[paramName])) {
                            result[paramName].push(paramValue);
                        } else {
                            result[paramName] = [result[paramName], paramValue];
                        }
                    }
                }
            });
        }

        return result;
    }

    // Demander les trois premiers contacts externes à l'API
    function requestExternalContacts() {
        let apiInstance = new platformClient.ExternalContactsApi();
        let opts = {
            pageSize: 6,
            pageNumber: 1
        };
        return apiInstance.getExternalcontactsContacts(opts)
            .then(data => {
                return data;
            });
    }

    function updateProgressBar(percent) {
        document.querySelector('.progress-bar').style.width = `${percent}%`;
    }
});