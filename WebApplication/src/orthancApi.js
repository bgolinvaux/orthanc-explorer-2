import axios from "axios"
import store from "./store"

import { orthancApiUrl, oe2ApiUrl } from "./globalConfigurations";

export default {
    async loadOe2Configuration() {
        return (await axios.get(oe2ApiUrl + "configuration")).data;
    },
    async loadDicomWebServers() {
        return (await axios.get(orthancApiUrl + "dicom-web/servers")).data;
    },
    async loadOrthancPeers() {
        return (await axios.get(orthancApiUrl + "peers")).data;
    },
    async loadDicomModalities() {
        return (await axios.get(orthancApiUrl + "modalities")).data;
    },
    async loadSystem() {
        return (await axios.get(orthancApiUrl + "system")).data;
    },
    async sendToDicomWebServer(resourcesIds, destination) {
        const response = (await axios.post(orthancApiUrl + "dicom-web/servers/" + destination + "/stow", {
            "Resources" : resourcesIds,
            "Synchronous": false
        }));
        
        return response.data['ID'];
    },
    async sendToOrthancPeer(resourcesIds, destination) {
        const response = (await axios.post(orthancApiUrl + "peers/" + destination + "/store", {
            "Resources" : resourcesIds,
            "Synchronous": false
        }));
        
        return response.data['ID'];
    },
    async sendToOrthancPeerWithTransfers(resources, destination) {
        const response = (await axios.post(orthancApiUrl + "transfers/send", {
            "Resources" : resources,
            "Compression": "gzip",
            "Peer": destination,
            "Synchronous": false
        }));
        
        return response.data['ID'];
    },
    async sendToDicomModality(resourcesIds, destination) {
        const response = (await axios.post(orthancApiUrl + "modalities/" + destination + "/store", {
            "Resources" : resourcesIds,
            "Synchronous": false
        }));
        
        return response.data['ID'];
    },
    async getJobStatus(jobId) {
        const response = (await axios.get(orthancApiUrl + "jobs/" + jobId));
        return response.data;
    },
    async deleteResource(level, orthancId) {
        return axios.delete(orthancApiUrl + this.pluralizeResourceLevel(level) + "/" + orthancId);
    },
    async cancelFindStudies() {
        if (window.axioFindStudiesAbortController) {
            window.axioFindStudiesAbortController.abort();
            window.axioFindStudiesAbortController = null;
        }
    },
    async findStudies(filterQuery) {
        await this.cancelFindStudies();
        window.axioFindStudiesAbortController = new AbortController();

        return (await axios.post(orthancApiUrl + "tools/find", {
                "Level": "Study",
                "Limit": store.state.configuration.uiOptions.MaxStudiesDisplayed,
                "Query": filterQuery,
                "RequestedTags": [
                    "ModalitiesInStudy"
                ],
                "Expand": true
            }, 
            {
                signal: window.axioFindStudiesAbortController.signal
            })).data;
    },
    async getSamePatientStudies(patientId) {
        const response = (await axios.post(orthancApiUrl + "tools/find", {
            "Level": "Study",
            "Limit": store.state.configuration.uiOptions.MaxStudiesDisplayed,
            "Query": {
                "PatientID": patientId
            },
            "Expand": false
        }));
        return response.data;
    },
    async findPatient(patientId) {
        const response = (await axios.post(orthancApiUrl + "tools/lookup", patientId));
        if (response.data.length == 1) {
            const patient = (await axios.get(orthancApiUrl + "patients/" + response.data[0]['ID']));
            return patient.data;
        } else {
            return null;
        }
    },
    async findStudy(studyInstanceUid) {
        const response = (await axios.post(orthancApiUrl + "tools/lookup", studyInstanceUid));
        if (response.data.length == 1) {
            const study = (await axios.get(orthancApiUrl + "studies/" + response.data[0]['ID']));
            return study.data;
        } else {
            return null;
        }
    },
    async mergeSeriesInExistingStudy({seriesIds, targetStudyId, keepSource}) {
        const response = (await axios.post(orthancApiUrl + "studies/" + targetStudyId + "/merge", {
            "Resources": seriesIds,
            "KeepSource": keepSource,
            "Synchronous": false
        }));
        return response.data['ID'];
    },
    async cancelRemoteDicomFindStudies() {
        if (window.axioRemoteDicomFindStudiesAbortController) {
            window.axioRemoteDicomFindStudiesAbortController.abort();
            window.axioRemoteDicomFindStudiesAbortController = null;
        }
    },
    async remoteDicomFindStudies(remoteModality, filterQuery) {
        await this.cancelRemoteDicomFindStudies();
        window.axioRemoteDicomFindStudiesAbortController = new AbortController();

        try {
            const queryResponse = (await axios.post(orthancApiUrl + "modalities/" + remoteModality + "/query", {
                    "Level": "Study",
                    "Query": filterQuery
                }, 
                {
                    signal: window.axioRemoteDicomFindStudiesAbortController.signal
                })).data;
            console.log(queryResponse);
            const answers = (await axios.get(orthancApiUrl + "queries/" + queryResponse["ID"] + "/answers?expand&simplify")).data;
            console.log(answers);
            return answers;
        } catch (err)
        {
            console.log("Error during query:", err);  // TODO: display error to user
            return {};
        }

    },
    async remoteDicomRetrieveStudy(remoteModality, filterQuery, targetAet, level) {
        const response = (await axios.post(orthancApiUrl + "modalities/" + remoteModality + "/move", {
            "Level": level,
            "Resources" : [
                filterQuery
            ],
            "TargetAet": targetAet,
            "Synchronous": false
        }));
        
        return response.data['ID'];
    },
    async remoteModalityEcho(remoteModality) {
        return axios.post(orthancApiUrl + "modalities/" + remoteModality + "/echo", {});
    },
    async uploadFile(filecontent) {
        return (await axios.post(orthancApiUrl + "instances", filecontent)).data;
    },
    async getPatient(orthancId) {
        return (await axios.get(orthancApiUrl + "patients/" + orthancId)).data;
    },
    async getStudy(orthancId) {
        // returns the same result as a findStudies (including RequestedTags !)
        return (await axios.get(orthancApiUrl + "studies/" + orthancId + "?requestedTags=ModalitiesInStudy")).data;
    },
    async getStudySeries(orthancId) {
        return (await axios.get(orthancApiUrl + "studies/" + orthancId + "/series")).data;
    },
    async getSeriesInstances(orthancId) {
        return (await axios.get(orthancApiUrl + "series/" + orthancId + "/instances")).data;
    },
    async getSeriesParentStudy(orthancId) {
        return (await axios.get(orthancApiUrl + "series/" + orthancId + "/study")).data;
    },
    async getInstanceTags(orthancId) {
        return (await axios.get(orthancApiUrl + "instances/" + orthancId + "/tags")).data;
    },
    async getInstanceHeader(orthancId) {
        return (await axios.get(orthancApiUrl + "instances/" + orthancId + "/header")).data;
    },
    async getStatistics() {
        return (await axios.get(orthancApiUrl + "statistics")).data;
    },
    async generateUid(level) {
        return (await axios.get(orthancApiUrl + "tools/generate-uid?level=" + level)).data;
    },
    async setVerboseLevel(level) {
        await axios.put(orthancApiUrl + "tools/log-level", level);
    },

    async getVerboseLevel() {
        return (await axios.get(orthancApiUrl + "tools/log-level")).data;
    },

    async shareStudy(orthancId, dicomId, anonymized, expirationInDays) {
        let expirationDate = null;
        
        if (expirationInDays > 0) {
            let today = new Date();
            expirationDate = new Date();
            expirationDate.setDate(today.getDate() + expirationInDays);
        }
                
        const response = (await axios.put(oe2ApiUrl + "shares", {
            "studies" : [{
                "dicom-uid": dicomId,
                "orthanc-id" : orthancId
            }],
            "anonymized": anonymized,
            "expiration-date": expirationDate
        }));
        
        return response.data['url'];
    },

    async getMedDreamInstantLink(dicomId) {
        const response = (await axios.put(oe2ApiUrl + "shares", {
            "studies" : [{
                "dicom-uid": dicomId,
                "orthanc-id" : null
            }],
            "anonymized": false,
            "expiration-date": null,
            "type": "meddream-instant-link"
        }));
        
        return response.data['url'];
    },

    async anonymizeResource({resourceLevel, orthancId, replaceTags={}, removeTags=[]}) {
        const response = (await axios.post(orthancApiUrl + this.pluralizeResourceLevel(resourceLevel) + "/" + orthancId + "/anonymize", {
            "Replace": replaceTags,
            "Remove": removeTags,
            "KeepSource": true,
            "Force": true,
            "Synchronous": false
        }))

        return response.data['ID'];
    },

    async modifyResource({resourceLevel, orthancId, replaceTags={}, removeTags=[], keepTags=[], keepSource}) {
        const response = (await axios.post(orthancApiUrl + this.pluralizeResourceLevel(resourceLevel) + "/" + orthancId + "/modify", {
            "Replace": replaceTags,
            "Remove": removeTags,
            "Keep": keepTags,
            "KeepSource": keepSource,
            "Force": true,
            "Synchronous": false
        }))

        return response.data['ID'];
    },

    ////////////////////////////////////////// HELPERS
    getOsimisViewerUrl(level, resourceOrthancId) {
        return orthancApiUrl + 'osimis-viewer/app/index.html?' + level + '=' + resourceOrthancId;
    },
    getStoneViewerUrl(level, resourceDicomUid) {
        return orthancApiUrl + 'stone-webviewer/index.html?' + level + '=' + resourceDicomUid;
    },    
    getInstancePreviewUrl(orthancId) {
        return orthancApiUrl + "instances/" + orthancId + "/preview";
    },
    getInstanceDownloadUrl(orthancId) {
        return orthancApiUrl + "instances/" + orthancId + "/file";
    },
    getDownloadZipUrl(level, resourceOrthancId) {
        return orthancApiUrl + this.pluralizeResourceLevel(level) + '/' + resourceOrthancId + '/archive';
    },
    getDownloadDicomDirUrl(level, resourceOrthancId) {
        return orthancApiUrl + this.pluralizeResourceLevel(level) + '/' + resourceOrthancId + '/media';
    },
    getApiUrl(level, resourceOrthancId, subroute) {
        return orthancApiUrl + this.pluralizeResourceLevel(level) + '/' + resourceOrthancId + subroute;
    },

    pluralizeResourceLevel(level) {
        if (level == "study") {
            return "studies"
        } else if (level == "instance") {
            return "instances"
        } else if (level == "patient") {
            return "patients"
        } else if (level == "series") {
            return "series"
        }
    }
}