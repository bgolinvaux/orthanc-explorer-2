<script>

import UploadHandler from "./UploadHandler.vue"
import JobsList from "./JobsList.vue";
import LanguagePicker from "./LanguagePicker.vue";
import { mapState } from "vuex"
import { orthancApiUrl, oe2ApiUrl } from "../globalConfigurations";
import api from "../orthancApi"

export default {
    props: [],
    emits: [],
    data() {
        return {
            selectedModality: null,
            modalitiesEchoStatus: {}
        };
    },
    computed: {
        ...mapState({
            uiOptions: state => state.configuration.uiOptions,
            system: state => state.configuration.system,
            queryableDicomModalities: state => state.configuration.queryableDicomModalities,
            queryableDicomWebServers: state => state.configuration.queryableDicomWebServers,
            studiesIds: state => state.studies.studiesIds,
            statistics: state => state.studies.statistics,
            jobs: state => state.jobs.jobsIds,
        }),

        hasQueryableDicomWebServers() {
            return false; // TODO this.queryableDicomWebServers.length > 0;
        },
        hasQueryableDicomModalities() {
            return this.uiOptions.EnableDicomModalities && this.queryableDicomModalities.length > 0;
        },
        hasAccessToSettings() {
            return this.uiOptions.EnableSettings;
        },
        hasJobs() {
            return this.jobs.length > 0;
        },
        displayedStudyCount() {
            return this.studiesIds.length;
        },
        orthancApiUrl() {
            return orthancApiUrl;
        }
    },
    methods: {
        selectModality(modality) {
            this.selectedModality = modality;
        },
        isSelectedModality(modality) {
            return this.selectedModality === modality;
        },
        isEchoRunning(modality) {
            return this.modalitiesEchoStatus[modality] == null;
        },
        isEchoSuccess(modality) {
            return this.modalitiesEchoStatus[modality] == true;
        }
    },
    mounted() {
        this.$refs['modalities-collapsible'].addEventListener('show.bs.collapse', (e) => {
            for (const modality of this.queryableDicomModalities) {
                this.modalitiesEchoStatus[modality] = null;
            }
            for (const modality of this.queryableDicomModalities) {
                api.remoteModalityEcho(modality).then((response) => {
                    this.modalitiesEchoStatus[modality] = true;
                }).catch(() => {
                    this.modalitiesEchoStatus[modality] = false;
                })
            }
        });
    },
    components: { UploadHandler, JobsList, LanguagePicker },
}
</script>
<template>
    <div class="nav-side-menu">
        <div>
            <img class="orthanc-logo" src="..//assets/images/orthanc.png" height="48" />
        </div>
        <div v-if="uiOptions.ShowOrthancName" class="orthanc-name">
            <p>{{ system.Name }}</p>
        </div>
        <div class="menu-list">
            <ul id="menu-content" class="menu-content collapse out">
                <li class="d-flex align-items-center fix-router-link">
                    <router-link class="router-link" to="/">
                        <i class="fa fa-x-ray fa-lg menu-icon"></i>{{ $t('local_studies') }}
                        <span class="study-count ms-auto">{{ displayedStudyCount }} / {{ statistics.CountStudies
                        }}</span>
                    </router-link>
                </li>

                <li v-if="uiOptions.EnableUpload" class="d-flex align-items-center" data-bs-toggle="collapse"
                    data-bs-target="#upload-handler">
                    <i class="fa fa-file-upload fa-lg menu-icon"></i>{{ $t('upload') }}
                    <span class="ms-auto"></span>
                </li>
                <div v-if="uiOptions.EnableUpload" class="collapse" id="upload-handler">
                    <UploadHandler />
                </div>

                <li v-if="hasQueryableDicomModalities" class="d-flex align-items-center" data-bs-toggle="collapse"
                    data-bs-target="#modalities-list">
                    <i class="fa fa-radiation fa-lg menu-icon"></i>{{ $t('dicom_modalities') }}
                    <span class="arrow ms-auto"></span>
                </li>
                <ul class="sub-menu collapse" id="modalities-list" ref="modalities-collapsible">
                    <li v-for="modality in queryableDicomModalities" :key="modality"
                        v-bind:class="{ 'active': this.isSelectedModality(modality) }" @click="selectModality(modality)">
                        <router-link class="router-link"
                            :to="{ path: '/filtered-remote-studies', query: { remoteMode: 'dicom', remoteSource: modality } }">
                            {{ modality }}
                        </router-link>
                        <span v-if="this.isEchoRunning(modality)" class="ms-auto spinner-border spinner-border-sm"
                            data-bs-toggle="tooltip" title="Checking connectivity"></span>
                        <span v-else-if="this.isEchoSuccess(modality)" class="ms-auto"><i
                                class="bi bi-check2 text-success echo-status" data-bs-toggle="tooltip"
                                title="C-Echo succeeded"></i></span>
                        <span v-else class="ms-auto"><i class="bi bi-x-lg text-danger echo-status"
                                data-bs-toggle="tooltip" title="C-Echo failed"></i></span>
                    </li>
                </ul>

                <li v-if="hasQueryableDicomWebServers" class="d-flex align-items-center" data-bs-toggle="collapse"
                    data-bs-target="#dicomweb-servers-list">
                    <i class="fa fa-globe fa-lg menu-icon"></i>{{ $t('dicom_web_servers') }}
                    <span class="arrow ms-auto"></span>
                </li>
                <ul class="sub-menu collapse" id="dicomweb-servers-list">
                    <li v-for="server in queryableDicomWebServers" :key="server" class="active">
                        <a href="#">{{ server }} (TODO)</a>
                    </li>
                </ul>

                <li v-if="hasAccessToSettings" class="d-flex align-items-center fix-router-link">
                    <router-link class="router-link" to="/settings">
                        <i class="fa fa-cogs fa-lg menu-icon"></i>{{ $t('settings') }}
                    </router-link>
                </li>

                <li v-if="uiOptions.EnableLinkToLegacyUi" class="d-flex align-items-center fix-router-link">
                    <a v-bind:href="this.orthancApiUrl + 'app/explorer.html'">
                        <i class="fa fa-solid fa-backward fa-lg menu-icon"></i>{{ $t('legacy_ui') }}
                    </a><span class="ms-auto"></span>
                </li>
                <li v-if="hasJobs" class="d-flex align-items-center">
                    <a href="#">
                        <i class="fa fa-solid fa-bars-progress fa-lg menu-icon"></i>{{ $t('my_jobs') }}
                    </a><span class="ms-auto"></span>
                </li>
                <div v-if="hasJobs" class="collapse show" id="jobs-list">
                    <JobsList />
                </div>
            </ul>
        </div>
        <div class="language-picker">
                <LanguagePicker />
            </div>
    </div>
</template>
<style scoped>
.router-link {
    width: 100%;
    text-align: left;
}

.fix-router-link {
    margin-left: -20px !important;
}

.echo-status {
    font-size: 17px;
}

.orthanc-name {
    border-bottom-width: 1px;
    border-bottom-style: solid;
    font-size: 1rem;
    margin-bottom: 0.3rem;
}

.orthanc-name p {
    margin-bottom: 0.3rem;
    font-weight: 500;
}

.orthanc-logo {
    filter: brightness(50);
}

.nav-side-menu {
    font-family: verdana;
    font-size: 12px;
    font-weight: 200;
    background-color: var(--nav-side-bg-color);
    color: var(--nav-side-color);
    height: 100%;
}


.nav-side-menu ul,
.nav-side-menu li {
    list-style: none;
    padding: 0px;
    margin: 0px;
    line-height: 35px;
    cursor: pointer;
}

.nav-side-menu ul :not(collapsed) .arrow:before,
.nav-side-menu li :not(collapsed) .arrow:before {
    font-family: "Font Awesome\ 5 Free";
    font-weight: 900;
    content: "\f0d7";
    display: inline-block;
    padding-left: 10px;
    padding-right: 10px;
    vertical-align: middle;
    float: right;
}

.nav-side-menu li .study-count {
    padding-right: 0px;
    float: right;
}

.nav-side-menu ul .active,
.nav-side-menu li .active {
    border-left: 3px solid #d19b3d;
    background-color: #4f5b69;
}

.nav-side-menu ul .sub-menu li.active,
.nav-side-menu li .sub-menu li.active {
    color: var(--nav-side-submenu-color);
    background-color: var(--nav-side-selected-bg-color);
}

.nav-side-menu ul .sub-menu li.active a,
.nav-side-menu li .sub-menu li.active a {
    color: var(--nav-side-submenu-color);
}

.nav-side-menu ul .sub-menu li,
.nav-side-menu li .sub-menu li {
    display: flex;
    background-color: #181c20;
    border: none;
    line-height: 28px;
    border-bottom: 1px solid #23282e;
    margin-left: 0px;
}

.nav-side-menu ul .sub-menu li:hover,
.nav-side-menu li .sub-menu li:hover {
    border-left: 3px solid #d19b3d;
    background-color: #4f5b69;
}

.nav-side-menu ul .sub-menu li:before,
.nav-side-menu li .sub-menu li:before {
    font-family: "Font Awesome\ 5 Free";
    font-weight: 900;
    content: "\f105";
    display: inline-block;
    padding-left: 20px;
    padding-right: 20px;
    vertical-align: middle;
}

.nav-side-menu li {
    margin-left: -10px;
    padding-left: 0px;
    border-left: 3px solid #2e353d;
    border-bottom: 1px solid #23282e;
}

.nav-side-menu li a {
    text-decoration: none;
    color: var(--nav-side-color);
}

.nav-side-menu li a i {
    padding-left: 10px;
    width: 20px;
    padding-right: 20px;
}

.nav-side-menu li:hover {
    border-left: 3px solid #d19b3d;
    background-color: #4f5b69;
}

.nav-side-menu .menu-list .menu-content {
    display: block;
}

.nav-side-menu .menu-list .menu-content {
    display: block;
}

.menu-list {
    margin-left: 10px;
    margin-right: 10px;
    font-size: 14px;
}

.menu-icon {
    width: 20px;
    margin-right: 10px;
}

.language-picker {
    position: absolute;
    bottom: 1rem;
    width: 100%;
}
</style>